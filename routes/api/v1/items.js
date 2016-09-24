'use strict';
const MetaInspector = require('node-metainspector');

const db = require('../../../database/database');
const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
const ItemImporter = require('../../../lib/import-twitter-items.js');

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
		'/items/slack': postSlackItems,
		'/items/chrome': postChromeItem
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
			return getFilteredUserItems(req, res);
		case 'filterSlackItems':
			return getFilteredSlackItems(req, res);
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
	const query = Object.assign({}, {user: id});

	Item.find(query).exec()
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

function getSlackTeamItems(req, res) {
	const teamId = req.query.teamId;
	const query = Object.assign({}, {slackTeamId: teamId});

	if (!teamId) {
		return res.status(404).end();
	}
	Item.find(query).exec()
	.then((items) => {
		//console.log('slack items found', items);
		return makeEmberItems(teamId, items);
		}
	)
	.then((obj) => {
		res.send({ items: obj.all });
	}, () => {
		return res.status(404).end();
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

function getFilteredUserItems(req, res) {
	const id = req.query.userId;
	const tagNames = req.query.tags.split('+');
	let query = {user: id};

	let tagPromisesArr = tagNames.map(tagname => {
		let tagsQuery = Object.assign({}, query, {name: tagname});
		return Tag.findOne(tagsQuery);
	});

	return Promise.all(tagPromisesArr).then((tagsArr) => {
		return tagsArr.map(tag => {
			if (tag !== null) {
				return tag._id;
			}
		});
	})
	.then((tagsArrIds) => {
		console.log('then query', query);
		let newQuery = Object.assign({}, query, {tags: {$all:tagsArrIds}});

		Item.find(newQuery).exec().then((items) => {
			return makeEmberItems(id, items);
		})
		.then((obj) => {
			res.send({items: obj.all});
		}, () => {
			return res.status(404).end();
		});
	});
}

function getFilteredSlackItems(req, res) {
	const teamId = req.query.teamId;
	console.log('teamId', teamId);
	const tagNames = req.query.tags.split('+');
	let teamQuery = {slackTeamId: teamId};
	let promisesArr = tagNames.map((tagName, i) => {
	let channelQuery = Object.assign({}, teamQuery, {'name' : tagNames[0]});
		return Tag.findOne(channelQuery).then(channel => {
			return channel;
		}).then(tag => {
			if (tag.isSlackChannel && i === 0) {
				//console.log('then channel', tag);
				return tag;
			}
			else {
				let tagsQuery = Object.assign({}, teamQuery, {name: tagName, slackChannelId: tag.slackChannelId});
				console.log('then tag', tag, 'tagsQuery', tagsQuery);

				return Tag.findOne(tagsQuery);
			}
		});
	});

	return Promise.all(promisesArr).then((tagsArr) => {
		return tagsArr.map(tag => {
			if (tag !== null) {
				return tag._id;
			}
		});
	})
	.then((tagsArrIds) => {
		console.log('then query', teamQuery);
		let newQuery = Object.assign({}, teamQuery, {tags: {$all:tagsArrIds}});

		Item.find(newQuery).exec().then((items) => {
			return makeEmberItems(teamId, items);
		})
		.then((obj) => {
			res.send({items: obj.all});
		}, () => {
			return res.status(404).end();
		});
	});
}

function getSearchItems(req, res) {
	const id = req.query.userId;
	const string = req.query.keyword;
	const query = {
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
  const emberItems = [];

  ItemImporter.importTwitterItems(req.user, req.query.options, function(err, items) {
    if (err) {
      return res.status(400).end();
    }
    items.forEach(function(item) {
			const newItem = new Item(item);
			const emberItem = newItem.makeEmberItem();

      emberItems.push(emberItem);
    });
		console.log('getTwitterItems', emberItems);
    return res.send({'items': emberItems});
  });
}

function putItems(req, res) {
	const itemTags = req.body.item.tags;
	let isPrivate = false;

	if (req.user.id === req.body.item.user) {
		Tag.find({name: {$in: itemTags}, user: req.user.id, isPrivate: 'true'})
		.exec().then(function(tags) {
			if (tags.length) {
				isPrivate = true;
			}
			return Item.findOneAndUpdate(
		    {_id: req.params.id},
		    {$set: {
					tags: req.body.item.tags,
					isPrivate: isPrivate,
					comments: req.body.item.comments
					}
				}, { new: true }
		  );
		})
		.then(item => {
			console.log('item updated', item);
			var emberItem = item.makeEmberItem();

			return res.send({'items': emberItem});
		})
		.then(null, (err) => {
			if (err) {
				console.log(err);
				return res.status(400).end();
			}
		});
	}
	else {
		return res.status(401).end();
	}
}

function postItem(req, res) {
	const itemTags = req.body.item.tags;
	const item = {
    user: req.body.item.user,
    createdDate: req.body.item.createdDate,
    body: req.body.item.body,
    author: req.body.item.author,
    tags: req.body.item.tags,
		isPrivate: false,
		type: req.body.item.type,
		//comments: req.body.item.comments
  };

	Tag.find({name: {$in: itemTags}, user: req.user.id, isPrivate: 'true'}).exec().then(function(tags) {
		if (tags.length) {
			item.isPrivate = true;
		}
	}).then(function() {
		if (req.user.id === req.body.item.user) {
	    const newItem = new Item(item);

	    newItem.save(function(err, item) {
	      if (err) {
	        res.status(500).end();
	      }
	      const emberItem = item.makeEmberItem();

	      return res.send({'item': emberItem});
	    });
	  }
	  else {
	    return res.status(401).end();
	  }
	});
}

function postChromeItem(req, res) {
	//console.log('received', req.body);
	return res.send({body: req.body});
}

function containsUrl(message) {
	return /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig.test(message);
}

function postSlackItems(req, res) {
	let messagesArr = Array.isArray(req.body) ? req.body : [req.body];
	let promiseArr = messagesArr.reduce((arr, message) => {
		return containsUrl(message.text) ? arr.concat(saveSlackItem(message)) : arr;
	}, []);
  // console.log('message received', req.body);
	// console.log('promise arr', promiseArr);
	Promise.all(promiseArr)
	.then(() => {
		res.status('201').send({});
	}, (err) => {
		console.log(err);
		return res.status(500).end();
	});
}

function saveSlackItem(message) {
	console.log(message);
	const slackTimestamp = message.timestamp || message.ts;
	const newTimestamp = slackTimestamp.split('.')[0] * 1000;
	const hasUrl = containsUrl(message.text);
	let unassignedTagId;

	console.log('message received', message.text, hasUrl);
	console.log('message has url');

	let slackItem = {
    user: message.user_name,
		author: message.user_name,
    createdDate: newTimestamp,
    body: message.text,
		type: 'slack',
		slackChannelId: message.channel_id,
		slackTeamId: message.team_id
  };

	return Tag.findOne({name: 'unassigned', slackChannelId: message.channel_id}).exec().then(tag => {
		if (tag) {
			return tag;
		}
		else {
			return Tag.create({
				name: 'unassigned',
				colour: 'cp-colour-1',
				slackChannelId: message.channel_id,
				slackTeamId: message.team_id
			});
		}
	})
	.then(tag => {
		unassignedTagId = tag._id;
	})
	.then(() => {
		return Tag.findOne({name:message.channel_name, slackChannelId: message.channel_id});
	})
	.then(function(tag) {
		if (!tag) {
			let newTag = {
				name: message.channel_name,
				isSlackChannel: true,
				slackChannelId: message.channel_id,
				slackTeamId: message.team_id,
				colour: 'cp-colour-1'
			};
			return Tag.create(newTag);
		}
		else {
			Object.assign(slackItem, {tags: [tag._id, unassignedTagId]});
		}
	})
	.then(tag => {
		if (tag) {
			Object.assign(slackItem, {tags: [tag._id, unassignedTagId]});
		}
	})
	.then(function() {
		let newItem = new Item(slackItem);
		console.log('new slack item', newItem);
		return newItem.save();
	});
}

function deleteItems(req, res) {
	Item.remove({ _id: req.params.id }).exec().then(function() {
    return res.send({});
  }).then(null, function(err) {
		console.log(err);
		return res.status(500).end();
	});
}


// .then((items) => {
// 	return updateItemTagsWithIds(query, items);
// })

// function updateItemTagsWithIds(query, items) {
// 	let allTagsArrArr = items.map((item) => {
// 		return item.tags;
// 	});
// 	let tagsPromiseArrArr = allTagsArrArr.map((tagNamesArr) => {
// 		return tagNamesArr.map((tagname) => {
// 			let tagQuery = Object.assign({}, query, {name: tagname});
// 			return Tag.findOne(tagQuery);
// 		});
// 	});
// 	return Promise.all(
// 		tagsPromiseArrArr.map(tagPromisesArr => {
// 			return Promise.all(tagPromisesArr);
// 		})
// 	)
// 	.then((tagsArrArr) => {
// 		let newTagsArrArr = tagsArrArr.map(tagsArr => {
// 			return tagsArr.map(tag => {
// 				if (tag !== null) {
// 					return tag._id;
// 				}
// 			});
// 		});
// 		console.log('newTagsArrArr', newTagsArrArr);
// 		return newTagsArrArr;
// 	})
// 	.then((newTagsArrArr) => {
// 		let itemsPromises = items.map((item, i) => {
// 			if (newTagsArrArr[i][0]) {
// 				return item.update({
// 					$set: {
// 						tags: newTagsArrArr[i]
// 					}
// 				});
// 			}
// 		});
// 		return Promise.all(itemsPromises);
// 	})
// 	.then(() => {
// 		return items;
// 	})
// 	.then(null, (err) => {
// 		console.log(err);
// 	});
// }
