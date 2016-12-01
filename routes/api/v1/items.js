'use strict';
const BPromise = require('bluebird');
const MetaInspector = require('node-metainspector');
const mongoose = require('mongoose');
const parseHtml = require('../../../lib/bookmark-parser.js');

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
		//'/items/updateMyItems': updateMyItemsAndTagsHandler
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
		case 'groupItems':
			return getGroupItemsHandler(req, res);
		case 'filterUserItems':
			return getFilteredUserItemsHandler(req, res);
		case 'filterGroupItems':
			return getFilteredGroupItemsHandler(req, res);
		case 'importItems':
			return getTwitterItemsHandler(req, res);
		default:
			return res.status(404).end();
	}
  return res.status(404).end();
}

function getUserItemsHandler(req, res) {
	const reqObj = {
		authUser: req.user,
		pageLimit: req.query.limit,
		pageNumber: req.query.page,
		userOrGroupId: req.query.userId,
		userOrGroupQuery: {user: req.query.userId},
	};
	//console.log('query', query);
	getUserItems(reqObj).then(obj => {
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

function getUserItems(reqObj) {
	return Item.paginate(reqObj.userOrGroupQuery, { page: reqObj.pageNumber, limit: reqObj.pageLimit, sort: { createdDate: -1 } })
	.then(pagedObj => {
		return makePublicOrPrivateItems(reqObj, pagedObj);
	});
}

function getFilteredUserItemsHandler(req, res) {
	const reqObj = {
		authUser: req.user,
		pageLimit: req.query.limit,
		pageNumber: req.query.page,
		tagNames: req.query.tags.split('+'),
		userOrGroupId: req.query.userId,
		userOrGroupQuery: {user: req.query.userId},
	};

	getFilteredItems(reqObj).then(obj => {
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

function getGroupItemsHandler(req, res) {
	const reqObj = {
		authUser: req.user,
		pageLimit: req.query.limit,
		pageNumber: req.query.page,
		userOrGroupId: req.query.groupId,
		userOrGroupQuery: {userGroup: req.query.groupId},
	};

	getGroupItems(reqObj).then(obj => {
		console.log('get group items obj returned before sending');
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

function getGroupItems(reqObj) {
	return Item.paginate(reqObj.userOrGroupQuery, { page: reqObj.pageNumber, limit: reqObj.pageLimit, sort: { createdDate: -1 } })
	.then((pagedObj) => {
		console.log('slack items found', pagedObj);
		return makeEmberItems(pagedObj);
		}
	);
}

function getFilteredGroupItemsHandler(req, res) {
	const reqObj = {
		authUser: req.user,
		pageLimit: req.query.limit,
		pageNumber: req.query.page,
		tagNames: req.query.tags.split('+'),
		userOrGroupId: req.query.groupId,
		userOrGroupQuery: {userGroup: req.query.groupId},
	};
	console.log('reqObj', reqObj);

	getFilteredItems(reqObj).then(obj => {
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

function getFilteredItems(reqObj) {
	let tagPromisesArr = reqObj.tagNames.map((tagname, i) => {
		let tagsQuery = Object.assign({}, reqObj.userOrGroupQuery, {name: tagname});
		if (i === 0) {
			return Category.findOne(tagsQuery);
		} else {
			return Tag.findOne(tagsQuery);
		}
	});

	return Promise.all(tagPromisesArr).then((tagsArr) => {
		return tagsArr.map(tag => {
			if (tag !== null) {
				return tag._id;
			}
		});
	}).then(tagsArrIds => {
		let categoryId = tagsArrIds.slice(0,1);
		let tagIds = tagsArrIds.slice(1, tagsArrIds.length);
		let newQuery;

		if (tagsArrIds.length === 1) {
			newQuery = Object.assign({}, reqObj.userOrGroupQuery, {category: categoryId});
		} else {
			newQuery = Object.assign({}, reqObj.userOrGroupQuery, {category: categoryId, tags: {$all:tagIds}});
		}
		return Item.paginate(newQuery, { page: reqObj.pageNumber, limit: reqObj.pageLimit, sort: { createdDate: -1 } });
	}).then((pagedObj) => {
		console.log('pagedObj before making public or private', pagedObj);
		return makePublicOrPrivateItems(reqObj, pagedObj);
	});
}

function getSearchItemsHandler(req, res) {
	const reqObj = {
		authUser: req.user,
		keyword: req.query.keyword,
		pageLimit: req.query.limit,
		pageNumber: req.query.page,
		userId: req.query.userId,
		groupId: req.query.groupId,
	};

	getSearchItems(reqObj).then(obj => {
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

function getSearchItems(reqObj) {
	const searchQuery = reqObj.groupId ? {
		userGroup : reqObj.groupId,
		$text: {
			$search: reqObj.keyword
		}
	} : {
		user: reqObj.userId,
		$text: {
			$search: reqObj.keyword
		}
	};

	return Item.paginate(searchQuery, { page: reqObj.pageNumber, limit: reqObj.pageLimit, sort: { createdDate: -1 } })
	.then((pagedObj) => {
		return makePublicOrPrivateItems(reqObj, pagedObj);
	});
}

function makePublicOrPrivateItems(reqObj, pagedObj) {
	const newObj = makeEmberItems(pagedObj);

	if (!reqObj.authUser) {
		return Object.assign({}, newObj, {items: newObj.public});
	}
	else if (reqObj.userOrGroupId === reqObj.authUser.id) {
		return Object.assign({}, newObj, {items: newObj.all});
	}
	else {
		return Object.assign({}, newObj, {items: newObj.public});
	}
}

function makeEmberItems(pagedObj) {
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

	Tag.find({_id: {$in: itemTags}, user: req.user.id, isPrivate: 'true'}).then(function(tags) {
		if (tags.length) {
			isPrivate = true;
		}
		return Item.findOneAndUpdate(
	    {_id: req.params.id},
	    {$set: {
				category: req.body.item.category,
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
		return Item.assignCategoryAndTags(titleArr[0], null, user.id);
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
		tagnames = [];
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
		author: message.user_name,
		body: message.text,
    createdDate: newTimestamp,
		slackChannelId: message.channel_id,
		slackTeamId: message.team_id,
		slackUserId: message.user_id,
		type: 'slack'
  };

	return UserGroup.findOne({slackTeamId: message.team_id}).then(userGroup => {
		if (userGroup !== null && typeof userGroup === 'object') {
			Object.assign(slackItem, {userGroup: userGroup.id});
		}
		return Category.findOne({userGroup: userGroup.id, slackChannelId: message.channel_id});
	}).then(slackCategory => {
		if (slackCategory !== null && typeof slackCategory === 'object') {
			//console.log('slack category found', slackCategory);
			Object.assign(slackItem, {category: slackCategory._id});
		} else {
			console.log('create new slack category');
			return Category.create({
				name: message.channel_name,
				slackChannelId: message.channel_id,
				userGroup: slackItem.userGroup
			});
		}
	}).then(category => {
		if (category) {
			Object.assign(slackItem, {category: category._id});
		}
		return Item.assignCategoryAndTags(message.text, slackItem.userGroup);
	}).then(tagsObj => {
		Object.assign(slackItem, {tags: tagsObj.tagIds});
    return Item.create(slackItem);
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


// function copyEmberItems(req, res) {
// 	// copy ember items to slack team
// 	return Item.find({user: 'stevetyler_uk', category: '5831be9314bdc60363409b95'}).then(items => {
// 	  console.log('ember items found');
// 	  let itemPromiseArr = items.map(item => {
// 	    let newSlackItem = {
// 				//category: '583354890885dcbe282927ed',
// 	      userGroup: 'Ember-London',
// 	      createdDate: item.createdDate,
// 	      body: item.body,
// 	      author: item.author,
// 	  		isPrivate: false,
// 				twitterTweetId: item.twitterTweetId,
// 	  		type: item.type
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

// update my items with new categories and update tags with new category
// function updateMyItemsAndTagsHandler(req, res) {
// 	console.log('update my items called');
// 	updateMyItemsAndTags().then(() => {
// 		res.send({items: []});
// 	})
// 	.catch(err => {
// 		console.log(err);
// 		res.status(401).end();
// 	});
// }
//
// function updateMyItemsAndTags() {
// 	const dataObj = {};
//
// 	return Tag.find({user: 'stevetyler_uk'}).then(tags => {
// 		Object.assign(dataObj, {tags: tags});
// 		const unassignedTagArr = tags.filter(tag => {
// 			return tag.name === 'unassigned';
// 		});
// 		Object.assign(dataObj, {unassignedId: unassignedTagArr[0]._id});
// 		makeCategoriesFromTags(tags);
// 	}).then(() => {
// 		return Category.find({user: 'stevetyler_uk'});
// 	}).then(categories => {
// 		Object.assign(dataObj, {categories: categories});
// 		return Item.find({user: 'stevetyler_uk'});
// 	}).then(items => {
// 		return updateItemsWithCategories(dataObj, items);
// 	}).then(() => {
// 		return Item.find({user: 'stevetyler_uk'});
// 	}).then(updatedItems => {
// 		console.log('4 update item tags', updatedItems.length);
// 		if (Array.isArray(updatedItems) && updatedItems.length > 0) {
// 			const itemsTagsPromiseArr = updatedItems.forEach(item => {
// 				if (item.category) {
// 					return updateItemTagsWithCategory(item);
// 				}
// 			});
// 			Promise.all(itemsTagsPromiseArr);
// 		}
// 	});
// }
//
// function makeCategoriesFromTags(tags) {
// 	console.log('makeCategories called');
// 	const categoryTagsArr = tags.filter(tag => {
// 		return tag.colour !== 'cp-colour-1';
// 	});
// 	const categoryPromiseArr = categoryTagsArr.map(tag => {
// 		return Category.create({
// 			colour: tag.colour,
// 			isPrivate: tag.isPrivate,
// 			name: tag.name,
// 			user: tag.user
// 		});
// 	});
//
// 	return Promise.all(categoryPromiseArr);
// }
//
// function updateItemsWithCategories(dataObj, items) {
// 	console.log('update item with categories', dataObj.categories, items.length);
// 	const filteredItems = items.filter(item => {
// 		return item.tags.indexOf(dataObj.unassignedId) === -1;
// 	});
//
// 	const itemsPromiseArr = filteredItems.map(item => {
// 		let categoryArr = [];
// 		const primaryTagId = item.tags[0];
// 		console.log('primaryTagId', primaryTagId, 'dataObj.tags', dataObj.tags.length);
// 		const primaryTagArr = dataObj.tags.filter(tag => {
// 			return tag._id == primaryTagId;
// 		});
//
// 		if (primaryTagArr.length) {
// 			console.log('primaryTag found', primaryTagArr, 'categories', dataObj.categories.length);
// 			categoryArr = dataObj.categories.filter(category => {
// 				console.log('category name to filter', category.name, primaryTagArr[0].name);
// 				return category.name === primaryTagArr[0].name;
// 			});
// 			console.log('category found', categoryArr);
// 		}
//
// 		if (categoryArr.length && categoryArr[0]) {
// 			const categoryId = categoryArr[0]._id;
// 			const newTags = item.tags;
// 			newTags.shift();
// 			console.log('new tags to apply to item', item);
// 			return Item.update({_id: item._id},
// 				{$set: {
// 					category: categoryId,
// 					tags: newTags
// 					}
// 				}
// 			);
// 		}
// 	});
// 	return Promise.all(itemsPromiseArr);
// }
//
// function updateItemTagsWithCategory(item) {
// 	if (item && typeof item === 'object') {
// 		console.log('item tags to be updated', item);
// 		const tagsPromiseArr = item.tags.map(tagId => {
//
// 			return Tag.update({_id: tagId},
// 				{$set: {
// 					category: item.category
// 					}
// 				}
// 			);
// 		});
// 		return Promise.all(tagsPromiseArr);
// 	}
// }
