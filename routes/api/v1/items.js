'use strict';
const MetaInspector = require('node-metainspector');
const mongoose = require('mongoose');

const itemSchema = require('../../../schemas/item.js');
const tagSchema = require('../../../schemas/tag.js');
const userSchema = require('../../../schemas/user.js');

const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
const ItemImporter = require('../../../lib/import-twitter-items.js');

const Item = mongoose.model('Item', itemSchema);
const Tag = mongoose.model('Tag', tagSchema);
const User = mongoose.model('User', userSchema);

module.exports.autoroute = {
	get: {
		'/items': getItems,
		'/items/get-title': getTitle
	},
	post: {
		'/items': [ensureAuthenticated, postItem],
		'/items/slack': postSlackItems,
		'/items/chrome': saveChromeItem
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
		return getSearchItemsHandler(req, res);
	}
	switch(req.query.operation)  {
		case 'userItems':
			return getUserItemsHandler(req, res);
		case 'filterUserItems':
			return getFilteredUserItemsHandler(req, res);
		case 'slackTeamItems':
			return getSlackTeamItemsHandler(req, res);
		case 'filterSlackItems':
			return getFilteredSlackItemsHandler(req, res);
		case 'importItems':
			return getTwitterItemsHandler(req, res);
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

function getUserItemsHandler(req, res) {
	const query = req.query;
	const authUser = req.user;
	console.log('query', query);

	getUserItems(query, authUser)
	.then(obj => {
		res.send({
			items: obj.items,
			meta: {
				total_pages: obj.pages,
				//item_count: obj.total,
				//pages: paginate.getArrayPages(req)(3, obj.pages, req.query.page)
			}
		});
	}, () => {
		res.status(404).end();
	});
}

function getUserItems(query, authUser) {
	console.log('query params', query);
	return Item.paginate({user: query.userId}, { page: query.page, limit: query.limit })
	.then(pagedObj => {
		return makePublicOrPrivateItems(query, authUser, pagedObj);
	});
}

function getFilteredUserItemsHandler(req, res) {
	const query = req.query;
	const authUser = req.user;

	getFilteredItems(query, authUser)
	.then(obj => {
		res.send({
			items: obj.items,
			meta: {
				total_pages: obj.pages
			}
		});
	}, () => {
		res.status(404).end();
	});
}

function getFilteredItems(query, authUser) {
	const tagNames = query.tags.split('+');

	let tagPromisesArr = tagNames.map(tagname => {
		let tagsQuery = Object.assign({}, {user: query.userId}, {name: tagname});
		return Tag.findOne(tagsQuery);
	});

	return Promise.all(tagPromisesArr)
	.then((tagsArr) => {
		return tagsArr.map(tag => {
			if (tag !== null) {
				return tag._id;
			}
		});
	})
	.then((tagsArrIds) => {
		//console.log('then 2 query', req.query);
		let newQuery = Object.assign({}, {user: query.userId}, {tags: {$all:tagsArrIds}});

		return Item.paginate(newQuery, { page: query.page, limit: query.limit });
	})
	.then((pagedObj) => {
		//console.log('then 3 pagedObj', pagedObj);
		return makePublicOrPrivateItems(query, authUser, pagedObj);
	});
}

function getSlackTeamItemsHandler(req, res) {
	const query = req.query;
	//console.log('query', query);

	getSlackTeamItems(query)
	.then(obj => {
		res.send({
			items: obj.all,
			meta: {
				total_pages: obj.pages
			}
		});
	}, () => {
		res.status(404).end();
	});
}

function getSlackTeamItems(query) {
	const teamQuery = {slackTeamId: query.teamId};

	return Item.paginate(teamQuery, { page: query.page, limit: query.limit })
	.then((pagedObj) => {
		return makeEmberItems(query.teamId, pagedObj);
		}
	);
}

function getFilteredSlackItemsHandler(req, res) {
	const query = req.query;

	getFilteredSlackItems(query)
	.then(obj => {
		res.send({
			items: obj.all,
			meta: {
				total_pages: obj.pages
			}
		});
	}, () => {
		res.status(404).end();
	});
}

function getFilteredSlackItems(query) {
	const tagNames = query.tags.split('+');
	const teamQuery = {slackTeamId: query.teamId};

	let promisesArr = tagNames.map((tagName, i) => {
		let channelQuery = Object.assign({}, teamQuery, {'name' : tagNames[0]});

		return Tag.findOne(channelQuery).then(channel => {
			return channel;
		}).then(tag => {
			if (tag.isSlackChannel && i === 0) {
				return tag;
			} else {
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
		//console.log('then query', teamQuery);
		let newQuery = Object.assign({}, teamQuery, {tags: {$all: tagsArrIds}});

		return Item.paginate(newQuery, { page: query.page, limit: query.limit });
	})
	.then((pagedObj) => {
		return makeEmberItems(query.teamId, pagedObj);
	});
}

function getSearchItemsHandler(req, res) {
	const query = req.query;
	const authUser = req.user;
	console.log('query', query);

	getSearchItems(query, authUser)
	.then(obj => {
		res.send({
			items: obj.items,
			meta: {
				total_pages: obj.pages,
			}
		});
	}, () => {
		res.status(404).end();
	});
}

function getSearchItems(query, authUser) {
	const searchQuery = {
		user: query.userId,
		$text: {
			$search: query.keyword
			//$caseSensitive: false // not compatible with Mongo v3
		}
	};
	return Item.paginate(searchQuery, { page: query.page, limit: query.limit })
	.then((pagedObj) => {
		return makePublicOrPrivateItems(query, authUser, pagedObj);
	});
}

function makePublicOrPrivateItems(query, authUser, obj) {
	const newObj = makeEmberItems(query.userId, obj);

	if (!authUser) {
		return Object.assign({}, newObj, {items: newObj.public});
	}
	else if (query.userId === authUser.id) {
		return Object.assign({}, newObj, {items: newObj.all});
	}
	else {
		return Object.assign({}, newObj, {items: newObj.public});
	}
}

function makeEmberItems(id, pagedObj) {
	return Object.assign({}, pagedObj, pagedObj.docs.reduce((obj, item) => {
		const emberItem = item.makeEmberItem();
		return item.isPrivate === 'true' ?
			{
				all: obj.all.concat(emberItem),
				public: obj.public } :
			{
				all: obj.all.concat(emberItem),
				public: obj.public.concat(emberItem),
			};
	}, { all: [], public: [] }));
}

function getTwitterItemsHandler(req, res) {
	getTwitterItems(req.user, req.query.options)
	.then(
		items => res.send({'items': items}),
		e => res.status('400').end()
	);
}

function getTwitterItems(user, options) {
  const emberItems = [];
	//console.log('getTwitterItems options', options, 'user', user);

  return ItemImporter.importTwitterItems(user, options)
	.then(items => {
		items.forEach(function(item) {
			const newItem = new Item(item);
			const emberItem = newItem.makeEmberItem();

      emberItems.push(emberItem);
    });
		//console.log('getTwitterItems', emberItems);
		return emberItems;
	});
}

function putItems(req, res) {
	const itemTags = req.body.item.tags;
	let isPrivate = false;

	if (req.user.id === req.body.item.user) {
		Tag.find({_id: {$in: itemTags}, user: req.user.id, isPrivate: 'true'})
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
	} else {
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
		type: req.body.item.type
  };

	Tag.find({_id: {$in: itemTags}, user: req.user.id, isPrivate: 'true'}).exec().then(function(tags) {
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
	  } else {
	    return res.status(401).end();
	  }
	});
}

function saveChromeItem(req, res) {
	const urlArr = req.body.urlarr;
	const titleArr = req.body.titlearr;
	let body = urlArr.length > 1 ? '<span>' + 'Tab URLs saved: ' + '</span>' : '';

	let bodyArr = urlArr.map((url, i) => {
		return '<a class="chrome-ext" href="' + url + '" target=" ">' + titleArr[i] + '</a>';
	});

	if (bodyArr.length === 1) {
		body += bodyArr[0];
	}
	else {
		let bodytext = bodyArr.reduce((str, url) => {
			return str + '<li>' + url + '</li>';
		}, '');
		body += '<ul>' + bodytext + '</ul>';
	}

	User.findOne({id: req.body.username, email: req.body.email})
	.then(user => {
		if (!user) {
			return res.status('401').send();
		}
		Tag.findOne({user: user.id, name: 'unassigned'})
		.then(tag => {
			if (tag) {
				const chromeItem = {
					user: req.body.username,
					createdDate: new Date(),
					body: body,
					author: req.body.username,
					tags: [tag._id],
					isPrivate: false,
					type: 'bookmark'
				};
				const newItem = new Item(chromeItem);

				newItem.save().then(() => {
					console.log('chrome item saved', newItem);
					return res.send({'item': newItem});
				});
			}
		});
	})
	.catch(() => {
		return res.status(401).end();
	});
}

function containsUrl(message) {
	return /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig.test(message);
}

function postSlackItems(req, res) {
	let messagesArr = Array.isArray(req.body) ? req.body : [req.body];
	let promiseArr = messagesArr.reduce((arr, message) => {
		return containsUrl(message.text) ? arr.concat(saveSlackItem(message)) : arr;
	}, []);

	Promise.all(promiseArr)
	.then(() => {
		res.status('201').send({});
	}, (err) => {
		console.log(err);
		return res.status(500).end();
	});
}

function saveSlackItem(message) {
	const slackTimestamp = message.timestamp || message.ts;
	const newTimestamp = slackTimestamp.split('.')[0] * 1000;
	let unassignedTagId;
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
		} else {
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
		} else {
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


// get new twitter items
// let getTweets = false;
// function checkAuth(userId, authUser) {
// 	let getTweets = false;
// 	if (authUser) {
// 		if (userId === authUser.id && authUser.twitterProfile) {
// 			if (authUser.twitterProfile.autoImport) {
// 				getTweets = true;
// 			}
// 		}
// 	}
// }
// const twitterItems = getTwitterItems(authUser, {getLatest: 'true'});


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
