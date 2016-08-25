"use strict";
const MetaInspector = require('node-metainspector');

const db = require('../../../database/database');
const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
const ItemImporter = require('../../../lib/import-items.js');

const Item = db.model('Item');
const Tag = db.model('Tag');
//const User = db.model('User');

module.exports.autoroute = {
	get: {
		'/items': getItems,
		'/items/get-title': getTitle
	},
	post: {
		'/items': [ensureAuthenticated, postItem],
		'/items/slack': postSlackItem
	},
	put: {
		'/items/:id': [ensureAuthenticated, putItems]
	},
	delete: {
		'/items/:id': [ensureAuthenticated, deleteItems]
	}
};

function getItems(req, res) {
	if (req.query.keyword || req.query.keyword === '') {
		return getSearchItems(req, res);
	}
	switch(req.query.operation)  {
		case 'userItems':
			return getUserItems(req, res);
		case 'slackTeamItems':
			return getSlackTeamItems(req, res);
		case 'filterUserItems':
			return getFilteredItems(req, res, 'user');
		case 'filterSlackItems':
			return getFilteredItems(req, res, 'slack');
		case 'importItems':
			return getTwitterItems(req, res);
		default:
			return res.status(404).end();
	}
  return res.status(404).end();
}

function getTitle(req, res) {
  const client = new MetaInspector(req.query.data, { timeout: 5000 });

	client.on('fetch', function(){
		if (client) {
			var title = client.title + ' | Link';

			return res.send(title);
		}
  });
  client.on('error', function(err){
		console.log(err);
		return res.status('404').end();
  });
  client.fetch();
}

function getUserItems(req, res) {
	const id = req.query.userId;

	Item.find({user: id}).exec()
	// .then((items) => {
	// 	return updateItemTagsWithIds(id, items);
	// })
	.then(items => {
		return makeEmberItems(id, items);
	})
	.then(function(obj) {
		if (!req.user) {
			return obj.public;
		}
		else if (req.user.id === req.query.userId) {
			return obj.all;
		}
		else {
			return obj.public;
		}
	})
	.then(items => {
		res.send({items: items});
	}, () => {
		return res.status(404).end();
	});
}

function updateItemTagsWithIds(id, items) {
	// find item tag by name and replace with id and save
	items.map(function(item) {
		let tagsArrPromises = item.tags.map(function(tag) {
			Tag.find({user: id, name: tag.name});
		})
		.then((tag) => {
			return tag._id;
		});

		Promise.all(tagsArrPromises).then((tagsArr) => {
			let updateItemTagsPromises = items.map((item, i) => {
				return item.update({$set: {
					tags: tagsArr[i]
					}
				});
			});
			Promise.all(updateItemTagsPromises).then(() => {

			});
		});
	});
}

function makeEmberItems(id, items) {
	return items.reduce((obj, item) => {
		const emberItem = item.makeEmberItem();
		return item.isPrivate === 'true' ?
			{
				all: obj.all.concat(emberItem),
				public: obj.public } :
			{
				all: obj.all.concat(emberItem),
				public: obj.public.concat(emberItem),
			};
	}, { all: [], public: [] });
}

function getSlackTeamItems(req, res) {
	const teamId = req.query.teamId;

	if (!teamId) {
		return res.status(404).end();
	}
	Item.find({slackTeamId: teamId}).exec().then((items) => {
		return makeEmberItems(teamId, items);
		}
	)
	.then((obj) => {
		res.send({ items: obj.all });
	}, () => {
		return res.status(404).end();
	});
}

function getFilteredItems(req, res, type) {
	const id = req.query.userId;
	const teamId = req.query.teamId;
	const tagIds = req.query.tags.toString().split('+');
	let query;

	if (type === 'user') {
		query = {user: id, tags: {$all:tagIds}};
	}
	else if (type === 'slack') {
		query = {slackTeamId: teamId, tags: {$all:tagIds}};
	}
	Item.find(query).exec().then((items) => {
		return makeEmberItems(id, items);
	})
	.then((obj) => {
		res.send({items: obj.all});
	}, () => {
		return res.status(404).end();
	});
}

function getSearchItems(req, res) {
	var id = req.query.userId;
	var string = req.query.keyword;
	var query = {
		user: req.query.userId,
		$text: {
			$search: string
			//$caseSensitive: false // not compatible with Mongo v3
		}
	};
	Item.find(query).exec().then((items) => {
		return makeEmberItems(id, items);
	})
	.then((items) => {
		res.send({items: items});
	}, () => {
		return res.status(404).end();
	});
}

function getTwitterItems(req, res) {
  var emberItems = [];

  ItemImporter.importTwitterItems(req.user, req.query.options, function(err, items) {
    if (err) {
      return res.status(400).end();
    }
    items.forEach(function(item) {
			var newItem = new Item(item);
			var emberItem = newItem.makeEmberItem();

      emberItems.push(emberItem);
    });
		console.log('getTwitterItems', emberItems);
    return res.send({'items': emberItems});
  });
}

function putItems(req, res) {
	var itemTags = req.body.item.tags;
	var isPrivate = false;

	if (req.user.id === req.body.item.user) {
		Tag.find({name: {$in: itemTags}, user: req.user.id, isPrivate: 'true'})
		.exec().then(function(tags) {
			if (tags.length) {
				isPrivate = true;
			}
			Item.update(
		    {_id: req.params.id},
		    {$set: {tags: req.body.item.tags, isPrivate: isPrivate}},
		    function(err) {
		      if (err) {
		        console.log(err);
		        return res.status(400).end();
		      }
		    return res.send({});
		    }
		  );
		});
	}
	else {
		return res.status(401).end();
	}
}

function postItem(req, res) {
	var itemTags = req.body.item.tags;
	var item = {
    user: req.body.item.user,
    createdDate: req.body.item.createdDate,
    body: req.body.item.body,
    author: req.body.item.author,
    tags: req.body.item.tags,
		isPrivate: false,
		type: req.body.item.type
  };

	Tag.find({name: {$in: itemTags}, user: req.user.id, isPrivate: 'true'}).exec().then(function(tags) {
		if (tags.length) {
			item.isPrivate = true;
		}
	}).then(function() {
		if (req.user.id === req.body.item.user) {
	    var newItem = new Item(item);

	    newItem.save(function(err, item) {
	      if (err) {
	        res.status(500).end();
	      }
	      var emberItem = item.makeEmberItem();

	      return res.send({'item': emberItem});
	    });
	  }
	  else {
	    return res.status(401).end();
	  }
	});
}

function containsUrl(message) {
	return /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig.test(message);
}

function postSlackItem(req, res) {
	var tags = [req.body.channel_name];
	var timestamp = req.body.timestamp.split('.')[0] * 1000;
  var hasUrl = containsUrl(req.body.text);
	var slackItem;

	console.log('message received', req.body.text, hasUrl);
	if (hasUrl) {
		slackItem = {
	    user: req.body.user_name,
			tags: tags,
			author: req.body.user_name,
	    createdDate: timestamp,
	    body: req.body.text,
			type: 'slack',
			slackChannelId: req.body.channel_id,
			slackTeamId: req.body.team_id
	  };
		Tag.find({name:req.body.channel_name, slackChannelId: req.body.channel_id}).exec().then(function(tags) {
			if (!tags.length) {
				var newTag = {
					name: req.body.channel_name,
					isSlackChannel: true,
					slackChannelId: req.body.channel_id,
					slackTeamId: req.body.team_id,
					colour: 'cp-colour-1'
				};
				//console.log('new tag', newTag);
				return Tag.create(newTag);
			}
		}).then(function() {
			var newItem = new Item(slackItem);

			newItem.save(function(err) {
				if (err) {
					res.status(500).end();
				}
				return res.send({});
			});
		}).then(null, function(err){
			console.log(err);
			return res.status(500).end();
		});
	}
}

function deleteItems(req, res) {
	Item.remove({ _id: req.params.id }).exec().then(function() {
    return res.send({});
  }).then(null, function(err) {
		console.log(err);
		return res.status(500).end();
	});
}


// function getFilteredItemsOld(req, res) {
//   var tagIds = req.query.tags.toString().split('+');
//   var query = {
// 		user: req.query.userId,
// 		tags: {$all:tagIds}
// 	};
//   makeEmberItems(req, res, query);
// }
