'use strict';

const AWS = require('aws-sdk');
const BPromise = require('bluebird');
const MetaInspector = require('node-metainspector-with-headers');
const mongoose = require('mongoose');
const parseHtml = require('../../../lib/bookmark-parser.js');

const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
const twitterItemImporter = require('../../../lib/import-twitter-items.js');

const categorySchema = require('../../../schemas/category.js');
const extractUrl = require('../../../lib/utilities/extractUrl.js');
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
		'/items/get-preview': getItemPreviewHandler,
		'/items/get-item-previews': getItemPreviewsHandler
	},
	post: {
		'/items': [ensureAuthenticated, postItemHandler],
		//'/items/bookmarks': [ensureAuthenticated, postBookmarkItemsHandler],
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

function getTitle(req, res) {
  const client = new MetaInspector(req.query.data, { timeout: 5000 });

	client.on('fetch', function(){
		if (client) {
			var title = client.title;

			return res.send(title);
		}
  });
  client.on('error', function(err){
		console.log(err);
		return res.status(404).end();
  });
  client.fetch();
}

function getItemPreviewHandler(req, res) {
	const item = req.query.item;

	return Item.getPreviewData(item).then(previewObj => {
		//console.log('preview obj received', previewObj);
		return Item.findOneAndUpdate({_id: item.id}, {
			$set: {
				itemPreview: previewObj
			}
		}, { new: true });
	}).then(item => {
		//console.log('item to make into emberItem', item);
		const emberItem = item.makeEmberItem();
		//console.log('emberItem with preview', emberItem);

		return res.send({'items': emberItem});
	}).catch(err => {
		console.log(err);
		return res.send();
	});
}

function getItemPreviewsHandler(req, res) {
	const userId = req.query.user;
	const categoryname = req.query.category;
	const groupId = req.query.group;
	const userOrGroup = userId ? { 'user': userId } : { 'userGroup' : groupId };
	const query = Object.assign({'name': categoryname}, userOrGroup);

	Category.findOne(query).then(category => {
		return Item.find({ user: userId, category: category._id });
	}).then(items => {
		//console.log('items found', items.length);
		const filterByPreviewArr = items.filter(item => {
			let hasUrl = false;
			try {
				hasUrl = !!item.itemPreview.url;
			} catch (err) {
				console.log(err);
			}

			return !item.itemPreview && !hasUrl;
		});

		const filteredItems = filterByPreviewArr.filter((item, i) => {
			return extractUrl(item.body) && i < 10;
		});
		//console.log('filtered items', filteredItems.length);
		const itemPreviewPromises = filteredItems.map(item => {
			return Item.getPreviewData(item).then(previewObj => {
				console.log('preview obj', previewObj);
				if (previewObj && typeof previewObj === 'object') {
					return Item.findOneAndUpdate({_id: item.id}, {
						$set: {
							itemPreview: previewObj
						}
					}, { new: true });
				}
			});
		});

		return Promise.all(itemPreviewPromises);
	}).then(itemsArr => {
		res.send({items: itemsArr});
	}).catch(err => {
		console.log(err);
		res.status(404).end();
	});
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
		//console.log('slack items found', pagedObj);
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
	//console.log('reqObj', reqObj);
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
	console.log('reqObj tagnames', reqObj.tagNames);
	const categoryQuery = Object.assign({}, reqObj.userOrGroupQuery, {name: reqObj.tagNames[0]});
	const tagNamesArr = reqObj.tagNames.slice(1, reqObj.tagNames.length);
	let categoryId;

	return Category.findOne(categoryQuery).then(category => {
		categoryId = category._id;

		if (tagNamesArr.length) {
			const tagPromisesArr = tagNamesArr.map(tagName => {
				let tagsQuery = Object.assign({}, reqObj.userOrGroupQuery, {category: category._id, name: tagName});

				return Tag.findOne(tagsQuery);
			});

			return Promise.all(tagPromisesArr).then((tagsArr) => {
				return tagsArr.map(tag => {
					if (tag !== null) {
						return tag._id;
					}
				});
			});
		}
		else {
			return [];
		}
	}).then(tagsArrIds => {
		let newQuery;
		if (tagsArrIds.length) {
			newQuery = Object.assign({}, reqObj.userOrGroupQuery, {category: categoryId, tags: {$all:tagsArrIds} } );
		}
		else {
			newQuery = Object.assign({}, reqObj.userOrGroupQuery, {category: categoryId } );
		}
		return Item.paginate(newQuery, { page: reqObj.pageNumber, limit: reqObj.pageLimit, sort: { createdDate: -1 } });
	}).then((pagedObj) => {
		//console.log('pagedObj before making public or private', pagedObj);
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
			res.status(400).end();
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
	Item.findOneAndUpdate(
    {_id: req.params.id},
    {$set: {
			category: req.body.item.category,
			tags: req.body.item.tags,
			isPrivate: req.body.item.isPrivate,
			comments: req.body.item.comments
			}
		}, { new: true }
  ).then(item => {
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

function postBookmarkItemsHandler(req, res) {
	const moveFile = BPromise.promisify(req.files.file.mv);
	const filename = req.files.file.name;
	const userId = req.user.id;
	let bookmarksArr, namesArrArr, categoryObjArr = [];

	if (!req.files) {
    res.send('No files were uploaded.');
    return;
  }
  moveFile('./lib/data-import/bookmarks/' + filename).then(() => {
		console.log('1 import file uploaded');
		bookmarksArr = parseHtml('./lib/data-import/bookmarks/' + filename, ['Bookmarks', 'Bookmarks Bar']);
		// add category to each tags array
		namesArrArr = bookmarksArr.map(obj => obj.tags);
		//const tagsArr = [].concat.apply([], tagsArrArr); // flatten array
		const uniqNamesArrArr = mergeTagArrays(namesArrArr);
		const categoryPromisesArr = uniqNamesArrArr.map(arr => {
			return Category.findOne({ user: userId, name: arr[0]}).then(category => {
				if (!category) {
					console.log('3 category created', arr[0]);
					Category.create({
						name: arr[0],
						colour: 'cp-colour-1',
						user: userId,
						itemCount: 0
					}).then(category => {
						categoryObjArr.push({
							category: category.name,
							id: category._id,
							tags: []
						});
					});
				} else {
					categoryObjArr.push({
						category: category.name,
						id: category._id,
						tags: []
					});
				}
			});
		});
		Promise.all(categoryPromisesArr);
		return;
	}).then(() => {
		// return array of categoryObjs with tags object
		const tagPromiseArr = namesArrArr.map(arr => {
			return arr.map((name, i) => {
				let categoryObj = categoryObjArr.filter(obj => obj.name === name).pop();

				if (i !== 0) {
					return Tag.findOne({ user: userId, category: categoryObj.id, name: name }).then(tag => {
						if (!tag) {
							console.log('4 tag created', name);
							Tag.create({
								category: categoryObj.id,
								name: name,
								colour: 'cp-colour-1',
								user: userId,
								itemCount: 0
							}).then(tag => {
								categoryObj.tags.push({
									id: tag._id,
									name: tag.name
								});
							});
						} else {
							categoryObj.tags.push({
								id: tag._id,
								name: tag.name
							});
						}
					});
				}
				return categoryObj;
			});
		});
		return Promise.all(tagPromiseArr);
	}).then(idsObjArr => {
		console.log('idsObjArr', idsObjArr);
		let bookmarkPromisesArr = bookmarksArr.map(bookmark => {
			//return saveBookmarkItem(bookmark, userId);
		});
		return Promise.all(bookmarkPromisesArr);
	}).then(() => {
		res.send('File uploaded!');
	}).catch(err => {
		console.log('import file error', err);
		res.status(500).send(err);
	});
}

function mergeTagArrays(tags) {
	let tmpArr = [];
	let newArrArr = [];

	tags.forEach((arr, i) => {
		if (i === 0) {
			tmpArr = arr;
		}
		else if (arr[0] === tmpArr[0]) {
			tmpArr = tmpArr.concat(arr);
		} else {
			newArrArr.push(tmpArr);
			tmpArr = arr;
		}
	});
	newArrArr.push(tmpArr);

	return newArrArr.map(arr => {
		return arr.filter((name, i, self) => {
			return self.indexOf(name) === i;
		});
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

function postChromeItemHandler(req, res) {
	const reqBody = req.body;

	saveChromeItem(reqBody).then(newItem => {
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
	console.log('saveChrome Item body received', reqBody);
	const urlArr = reqBody.urlarr;
	const titleArr = reqBody.titlearr;
	let text = urlArr.length > 1 ? makeUrlList(urlArr, titleArr) : urlArr[0];
	const options = {};

	return User.findOne({id: reqBody.username, email: reqBody.email}).then(user => {
		Object.assign(options, {user: user.id});
		const textToSearch = urlArr[0].concat(titleArr[0]);

		return Item.getCategoryAndTags(textToSearch, options);
	}).then(idsObj => {
		console.log('tags to be assigned', idsObj);
		return (typeof idsObj === 'object') ? Item.create({
			author: reqBody.username,
			body: text,
			category: idsObj.category,
			createdDate: new Date(),
			isPrivate: false,
			tags: idsObj.tags,
			title: reqBody.titlearr,
			type: 'bookmark',
			user: reqBody.username,
		}) : null;
	});
}

// create item from Collated
function postItemHandler(req, res) {
	const bodyItem = req.body.item;
	const userGroup = bodyItem.userGroup;
	const idsObj = {
		user: userGroup ? null : req.user.id,
		userGroup: userGroup ? userGroup : null
	};
	const item = {
		author: bodyItem.author,
		body: bodyItem.body,
		createdDate: bodyItem.createdDate,
		isPrivate: false,
		title: bodyItem.title,
		twitterTweetId: bodyItem.twitterTweetId,
		type: bodyItem.type,
	};
	let itemId;

	return Item.getCategoryAndTags(bodyItem.body, idsObj).then(categoryIdsObj => {
		const newItem = Object.assign(item, idsObj, categoryIdsObj);
		console.log('new item to create', newItem);

		return Item.create(newItem);
	}).then(newItem => {
		itemId = newItem._id;
		return Item.getPreviewData(newItem);
	}).then(previewObj => {
		//console.log('preview obj received', previewObj);
		return Item.findOneAndUpdate({_id: itemId}, {
			$set: {
				itemPreview: previewObj
			}
		}, { new: true });
	}).then(newItem => {
		//console.log('newItem to make ember', newItem);
 		return newItem.makeEmberItem();
	}).then(emberItem => {
		return res.send({'item': emberItem});
	}).catch(err => {
		console.log(err);
		return res.status(404).end();
	});
}

function postSlackItemsHandler(req, res) {
	console.log('post slack item called');
	const messagesArr = Array.isArray(req.body) ? req.body : [req.body];
	const slackTeamId = messagesArr[0].team_id;

	UserGroup.findOne({slackTeamId: slackTeamId})
	.then(userGroup => {
		const options = {
			userGroup: userGroup.id,
			categoryPerChannel: userGroup.categoryPerSlackChannel
		};
		const promiseArr = messagesArr.reduce((arr, message) => {
			return containsUrl(message.text) ? arr.concat(saveSlackItem(message, options)) : arr;
		}, []);

		return Promise.all(promiseArr);
	}).then(() => {
		res.status(201).send({});
	}, (err) => {
		console.log(err);
		return res.status(500).end();
	});
}

function saveSlackItem(message, options) {
	const slackTimestamp = message.timestamp || message.ts;
	const newTimestamp = slackTimestamp.split('.')[0] * 1000;
	const newSlackItem = {
		author: message.user_name,
		body: message.text,
		createdDate: newTimestamp,
		slackChannelId: message.channel_id,
		slackTeamId: message.team_id,
		slackUserId: message.user_id,
		type: 'slack',
		userGroup: options.userGroup
	};
	Object.assign(options, {slackChannelId: message.channel_id});

	return Item.getCategoryAndTags(message.text, options)
	.then(idsObj => {
		Object.assign(newSlackItem, idsObj);
		//console.log('new slack item to save', newSlackItem);
    return Item.create(newSlackItem);
  });
}

function deleteItems(req, res) {
	let s3folder;
	let fileType;

	if (process.env.NODE_ENV === 'production') {
		s3folder = 'assets/images/previews/';
	} else {
		s3folder = 'assets/images/previews/dev/';
	}

	Item.findOne({_id: req.params.id}).then(item => {
		try {
			fileType = item.itemPreview.imageType;
		}
		catch (err) {
			//console.log(err);
		}

		return Item.remove({ _id: item._id });
	}).then(() => {
		const s3 = new AWS.S3();
		const params = {
      Bucket: 'collated-assets',
			Delete: {
				Objects: [
					{ Key: s3folder + req.params.id + '-sml.' + fileType },
					{	Key: s3folder + req.params.id + '-med.' + fileType },
					{	Key: s3folder + req.params.id + '-lrg.' + fileType }
				]
			}
    };

		return s3.deleteObjects(params).promise();
	}).then(() => {
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

// function extractUrl(text) {
//   let str = text ? text : '';
//   let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
//   let urls = str.match(urlRegex);
//
//   return urls ? urls[0] : null;
// }
