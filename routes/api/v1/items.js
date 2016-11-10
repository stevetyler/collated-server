'use strict';
const BPromise = require('bluebird');
const MetaInspector = require('node-metainspector');
const mongoose = require('mongoose');
const parseHtml = require('../../../lib/bookmark-parser.js');

const assignItemTags = require('../../../lib/assign-item-tags.js');
const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
const twitterItemImporter = require('../../../lib/import-twitter-items.js');

const categorySchema = require('../../../schemas/category.js');
const itemSchema = require('../../../schemas/item.js');
const tagSchema = require('../../../schemas/tag.js');
const userSchema = require('../../../schemas/user.js');
const userGroupSchema = require('../../../schemas/userGroup.js');

const Category = mongoose.model('Category', categorySchema);
const Item = mongoose.model('Item', itemSchema);
const Tag = mongoose.model('Tag', tagSchema);
const User = mongoose.model('User', userSchema);
const UserGroup = mongoose.model('UserGroup', userGroupSchema);

module.exports.autoroute = {
	get: {
		'/items': getItems,
		'/items/get-title': getTitle,
		//'/items/copyEmberItems': copyEmberItems
	},
	post: {
		'/items': [ensureAuthenticated, postItemHandler],
		'/items/bookmarks': [ensureAuthenticated, postBookmarkItemsHandler],
		'/items/slack': postSlackItemsHandler,
		'/items/chrome': postChromeItemHandler
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
	//console.log('query', query);
	getUserItems(query, authUser).then(obj => {
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

function getUserItems(query, authUser) {
	return Item.paginate({ user: query.userId }, { page: query.page, limit: query.limit, sort: { createdDate: -1 } })
	.then(pagedObj => {
		return makePublicOrPrivateItems(query, authUser, pagedObj);
	});
}

function getFilteredUserItemsHandler(req, res) {
	const query = req.query;
	const authUser = req.user;

	getFilteredItems(query, authUser).then(obj => {
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

	return Promise.all(tagPromisesArr).then((tagsArr) => {
		return tagsArr.map(tag => {
			if (tag !== null) {
				return tag._id;
			}
		});
	}).then((tagsArrIds) => {
		let newQuery = Object.assign({}, {user: query.userId}, {tags: {$all:tagsArrIds}});

		return Item.paginate(newQuery, { page: query.page, limit: query.limit, sort: { createdDate: -1 } });
	}).then((pagedObj) => {
		return makePublicOrPrivateItems(query, authUser, pagedObj);
	});
}

function getSlackTeamItemsHandler(req, res) {
	const query = req.query;

	getSlackTeamItems(query).then(obj => {
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
	const teamQuery = {userGroup: query.groupId};
	console.log('slack team query', teamQuery);
	return Item.paginate(teamQuery, { page: query.page, limit: query.limit, sort: { createdDate: -1 } })
	.then((pagedObj) => {
		console.log('slack items found', pagedObj);
		return makeEmberItems(query.groupId, pagedObj);
		}
	);
}

function getFilteredSlackItemsHandler(req, res) {
	const query = req.query;

	getFilteredSlackItems(query).then(obj => {
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
	const teamQuery = {userGroup: query.groupId};

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
	}).then((tagsArrIds) => {
		let newQuery = Object.assign({}, teamQuery, {tags: {$all: tagsArrIds}});

		return Item.paginate(newQuery, { page: query.page, limit: query.limit, sort: { createdDate: -1 } });
	}).then((pagedObj) => {
		return makeEmberItems(query.groupId, pagedObj);
	});
}

function getSearchItemsHandler(req, res) {
	const query = req.query;
	const authUser = req.user;
	console.log('query', query);

	getSearchItems(query, authUser).then(obj => {
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
	const searchQuery = query.groupId ? {
		userGroup : query.groupId,
		$text: {
			$search: query.keyword
		}
	} : {
		user: query.userId,
		$text: {
			$search: query.keyword
		}
	};
	return Item.paginate(searchQuery, { page: query.page, limit: query.limit, sort: { createdDate: -1 } })
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
	getTwitterItems(req.user, req.query.options).then(
		items => res.send({'items': items}),
		e => {
			console.log(e);
			res.status('400').end();
		}
	);
}

function getTwitterItems(user, options) {
  const emberItems = [];

  return twitterItemImporter(user, options).then(items => {
		items.forEach(function(item) {
			const newItem = new Item(item);
			const emberItem = newItem.makeEmberItem();

      emberItems.push(emberItem);
    });
		return emberItems;
	});
}

function putItems(req, res) {
	const itemTags = req.body.item.tags;
	let isPrivate = false;

	if (req.user.id === req.body.item.user) {
		Tag.find({_id: {$in: itemTags}, user: req.user.id, isPrivate: 'true'}).then(function(tags) {
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
		}).then(item => {
			console.log('item updated', item);
			var emberItem = item.makeEmberItem();

			return res.send({'items': emberItem});
		}).then(null, (err) => {
			if (err) {
				console.log(err);
				return res.status(400).end();
			}
		});
	} else {
		return res.status(401).end();
	}
}

// create item from Collated
function postItemHandler(req, res) {
	const body = req.body;
	const user = req.user;

	saveItem(body, user).then((emberItem) => {
		console.log('saveItem', emberItem);
		res.send({'item': emberItem});
		return;
	}).catch(err => {
		console.log(err);
		res.status(401).end();
		return;
	});
}

function saveItem(body, user) {
	const itemTags = body.item.tags;
	const item = {
    user: body.item.user,
    createdDate: body.item.createdDate,
    body: body.item.body,
		title: body.item.title,
    author: body.item.author,
    tags: body.item.tags,
		isPrivate: false,
		type: body.item.type
  };

	return Tag.find({_id: {$in: itemTags}, user: user.id, isPrivate: 'true'}).then(function(tags) {
		if (tags.length) {
			return Object.assign(item, {isPrivate: true});
		} else {
			return item;
		}
	}).then(itemObj => {
		if (user.id === body.item.user) {
	    const newItem = new Item(itemObj);

	    return newItem.save();
	  }
	}).then((newItem) => {
		return newItem.makeEmberItem();
	});
}

function postChromeItemHandler(req, res) {
	const reqBody = req.body;

	saveChromeItem(reqBody).then((newItem) => {
		console.log('chrome item saved', newItem);
		res.send({'item': newItem});
		return;
	}).catch((err) => {
		console.log('error', err);
		res.status(401).end();
		return;
	});
}

function saveChromeItem(reqBody) {
	console.log('saveChrome Item body', reqBody);
	const urlArr = reqBody.urlarr;
	const titleArr = reqBody.titlearr;
	let text = urlArr.length > 1 ? makeUrlList(urlArr, titleArr) : urlArr[0];

	return User.findOne({id: reqBody.username, email: reqBody.email}).then(user => {
		return assignItemTags(titleArr[0], null, user.id);
	}).then(tagsObj => {
		console.log('tags to be assigned', tagsObj);
		return tagsObj === 'object' ? Item.create({
			author: reqBody.username,
			body: text,
			category: tagsObj.categoryId,
			createdDate: new Date(),
			isPrivate: false,
			tags: tagsObj.tagIds,
			title: reqBody.titlearr,
			type: 'bookmark',
			user: reqBody.username,
		}) : null;
	});
}

function postBookmarkItemsHandler(req, res) {
	const moveFile = BPromise.promisify(req.files.file.mv);
	const filename = req.files.file.name;
	const userId = req.user.id;
	let bookmarksArr;

	if (!req.files) {
    res.send('No files were uploaded.');
    return;
  }
  moveFile('./lib/data-import/bookmarks/' + filename).then(() => {
		console.log('1 import file uploaded');
		bookmarksArr = parseHtml('./lib/data-import/bookmarks/' + filename, ['Bookmarks', 'Bookmarks Bar']);

		let tagsArrArr = bookmarksArr.map(obj => obj.tags);
		let tagsArr = [].concat.apply([], tagsArrArr); // flatten array
		let uniqTagnameArray = tagsArr.filter(function(tagname, i, self) {
			return self.indexOf(tagname) === i;
		});
		console.log('2 unique array', uniqTagnameArray);
		let tagPromisesArr = uniqTagnameArray.map(tagname => {
			return Tag.findOne({user: userId, name: tagname}).then(tag => {
				if (!tag) {
					console.log('3 tag created', tagname);
					Tag.create({
						name: tagname,
						colour: 'cp-colour-1',
						user: userId,
						itemCount: 0
					});
				}
			});
		});
		return Promise.all(tagPromisesArr);
  }).then(() => {
		let bookmarkPromisesArr = bookmarksArr.map(bookmark => {
			return saveBookmarkItem(bookmark, userId);
		});
		return Promise.all(bookmarkPromisesArr);
	}).then(() => {
		res.send('File uploaded!');
	}).catch(err => {
		console.log('import file error', err);
		res.status(500).send(err);
	});
}

function saveBookmarkItem(bookmark, userId) {
  const body = bookmark.url;
	const title = bookmark.title;
  let tagnames;

	if (bookmark.tags.length) {
		tagnames = bookmark.tags.map((tag, i) => {
	    return bookmark.tags[bookmark.tags.length -1 -i]; // reverse tags order
	  });
	} else {
		tagnames = ['unassigned'];
	}
	console.log('4 tagnames', tagnames);
	const tagPromises = tagnames.map(tagname => {
		// when creating tag here, duplicates occur?
		return Tag.findOne({user: userId, name: tagname}).then(tag => {
			return tag._id;
		}).catch(err => {
			console.log(err);
		});
	});

	return Promise.all(tagPromises).then(ids => {
		console.log('item created with ids', ids);
		return Item.create({
			user: userId,
	    createdDate: bookmark.date,
	    body: body,
			title: title,
	    author: userId,
	    tags: ids,
	    isPrivate: false,
	    type: 'bookmark'
		});
	});
}

function postSlackItemsHandler(req, res) {
	console.log('post slack item called');
	let messagesArr = Array.isArray(req.body) ? req.body : [req.body];
	let promiseArr = messagesArr.reduce((arr, message) => {
		return containsUrl(message.text) ? arr.concat(saveSlackItem(message)) : arr;
	}, []);

	Promise.all(promiseArr).then(() => {
		res.status('201').send({});
	}, (err) => {
		console.log(err);
		return res.status(500).end();
	});
}

function saveSlackItem(message) {
	const slackTimestamp = message.timestamp || message.ts;
	const newTimestamp = slackTimestamp.split('.')[0] * 1000;
	const slackItem = {
    user: message.user_name,
		author: message.user_name,
    createdDate: newTimestamp,
    body: message.text,
		type: 'slack',
		slackChannelId: message.channel_id,
		slackTeamId: message.team_id
  };

	return UserGroup.findOne({slackTeamId: message.team_id}).then(userGroup => {
		if (userGroup !== null && typeof userGroup === 'object') {
			Object.assign(slackItem, {userGroup: userGroup.id});
		}
		return Category.findOne({userGroup: userGroup.id, slackChannelId: message.channel_id});
	}).then(slackCategory => {
		if (slackCategory !== null && typeof slackCategory === 'object') {
			console.log('slack category found', slackCategory);
			Object.assign(slackItem, {category: slackCategory});
		} else {
			console.log('create new slack category');
			return createCategoryAndTag(message, slackItem.userGroup);
		}
	}).then(idObj => {
		console.log('idObj returned', idObj);
		if (idObj !== null && typeof idObj === 'object') {
			Object.assign(slackItem, {category: idObj.categoryId});
		}
		return assignItemTags(message.text, slackItem.userGroup);
	}).then(tagsObj => {
		Object.assign({}, slackItem, {tags: tagsObj.tagIds});
		console.log('slack item to create', slackItem);
    return Item.create(slackItem);
  });
}

function createCategoryAndTag(message, userGroupId) {
	const idObj = {};
	console.log('createCategory', message, userGroupId);
	return Category.create({
		name: message.channel_name,
		slackChannelId: message.channel_id,
		userGroup: userGroupId
	}).then(category => {
		Object.assign(idObj, {categoryId: category._id});
		return Tag.create({
			name: 'unassigned',
			category: category._id,
			userGroup: category.userGroup
		});
	}).then(tag => {
		Object.assign(idObj, {unassignedTagId: tag._id});
		console.log('idObj to be returned', idObj);
		return idObj;
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


function containsUrl(message) {
	return /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig.test(message);
}

function makeUrlList(urlArr, titleArr) {
	let bodyArr = urlArr.map((url, i) => {
		return '<a href="' + url + '" >' + titleArr[i] + '</a>';
	});
	let bodytext = bodyArr.reduce((str, url) => {
		return str + '<li>' + url + '</li>';
	}, '');
	return '<span>' + 'Tab URLs saved: ' + '</span>' + '<ul>' + bodytext + '</ul>';
}

// function copyEmberItems(req, res) {
// 	// copy ember items to slack team
// 	return Item.find({user: 'stevetyler_uk', tags: {$in: ['5718a22b5dff4d1d3c81ae56']}}).then(items => {
// 	  console.log('ember items found');
// 	  let itemPromiseArr = items.map(item => {
// 	    let newSlackItem = {
// 	      user: 'stevetyler',
// 	      createdDate: item.createdDate,
// 	      body: item.body,
// 	      author: item.author,
// 	  		isPrivate: false,
// 	  		type: item.type,
// 	      slackTeamId: 'T03SSL0FF' // Ember-London team id
// 	    };
// 	    console.log('save new ember item', newSlackItem);
// 	    Item.create(newSlackItem);
// 	  });
// 	  return Promise.all(itemPromiseArr);
// 	}).then(() => {
// 		res.send({
// 			items: ['success']
// 		});
// 	}).catch(err => {
// 	  console.log(err);
// 	});
// }
