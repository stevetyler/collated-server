var MetaInspector = require('node-metainspector');

var db = require('../../../database/database');
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
var ItemImporter = require('../../../lib/import-items.js');

var Item = db.model('Item');
var Tag = db.model('Tag');
var User = db.model('User');

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
		case 'filterItems':
			return getFilteredItems(req, res);
		case 'importItems':
			return getTwitterItems(req, res);
		default:
			return res.status(404).end();
	}
  return res.status(404).end();
}

function getTitle(req, res) {
  var client = new MetaInspector(req.query.data, { timeout: 5000 });

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
	var query = {user: req.query.userId};

	makeEmberItems(req, res, query);
}

function getSlackTeamItems(req, res) {
	var query = {slackTeamId: req.query.teamId};

	makeEmberItems(req, res, query);
}

// change to query user from Ember, send operation getSlackItems etc
function getFilteredItems(req, res) {
	var tagIds = req.query.tags.toString().split('+');
	var query;

	User.findOne({id: req.query.userId}).then(function(user) {
		if (user.slackProfile.teamId) {
			query = {
				slackTeamId: user.slackProfile.teamId,
				tags: {$all:tagIds}
			};
			makeEmberItems(req, res, query);
		}
		else {
			query = {
				user: req.query.userId,
				tags: {$all:tagIds}
			};
			makeEmberItems(req, res, query);
		}
	}).then(null, function() {
		return res.status(404).end();
	});
}

function getFilteredItemsOld(req, res) {
  var tagIds = req.query.tags.toString().split('+');
  var query = {
		user: req.query.userId,
		tags: {$all:tagIds}
	};
  makeEmberItems(req, res, query);
}

function getSearchItems(req, res) {
	var string = req.query.keyword;
	var query = {
		user: req.query.userId,
		$text: {
			$search: string
			//$caseSensitive: false // not compatible with Mongo v3
		}
	};
	makeEmberItems(req, res, query);
}

function makeEmberItems(req, res, query) {
	var allEmberItems = [];
	var publicEmberItems = [];

	Item.find(query, function(err, items) {
		if (err) {
			return res.status(404).send();
		}
		items.forEach(function(item) {
			var emberItem = item.makeEmberItem();

			if (item.isPrivate === 'true') {
				allEmberItems.push(emberItem);
			}
			else {
				allEmberItems.push(emberItem);
				publicEmberItems.push(emberItem);
			}
		});
		if (!req.user) {
			return res.send({'items': publicEmberItems});
		}
		else if (req.user.id === req.query.userId) {
			return res.send({'items': allEmberItems});
		}
		else {
			return res.send({'items': publicEmberItems});
		}
	});
}

function getTwitterItems(req, res) {
  var emberItems = [];

  ItemImporter.importTwitterItems(req.user, req.query.options, function(err, items) {
    if (err) {
      return res.status(400).end();
    }
    items.forEach(function(item) {
      var emberItem = item.makeEmberItem();

      emberItems.push(emberItem);
    });
    return res.send({'items': emberItems});
  });
}

function putItems(req, res) {
	var itemTags = req.body.item.tags;
	var isPrivate = false;

	if (req.user.id === req.body.item.user) {
		Tag.find({id: {$in: itemTags}, user: req.user.id, isPrivate: 'true'})
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

	Tag.find({id: {$in: itemTags}, user: req.user.id, isPrivate: 'true'}).exec().then(function(tags) {
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
			slackTeamId: req.body.team_id
	  };
		Tag.find({id:req.body.channel_name, slackChannelId: req.body.channel_id}).exec().then(function(tags) {
			if (!tags.length) {
				var newTag = {
					id: req.body.channel_name,
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
