'use strict';
const MetaInspector = require('node-metainspector');
const mongoose = require('mongoose');
const parseHtml = require('../../../lib/bookmark-parser.js');
const BPromise = require('bluebird');

const itemSchema = require('../../../schemas/item.js');
const tagSchema = require('../../../schemas/tag.js');
const userSchema = require('../../../schemas/user.js');

const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
const TwitterItemImporter = require('../../../lib/import-twitter-items.js');

const Item = mongoose.model('Item', itemSchema);
const Tag = mongoose.model('Tag', tagSchema);
const User = mongoose.model('User', userSchema);

module.exports.autoroute = {
	get: {
		'/items': getItems,
		'/items/get-title': getTitle,
		'/items/copyEmberItems': copyEmberItems
	},
	post: {
		'/items': [ensureAuthenticated, postItem],
		'/items/bookmarks': [ensureAuthenticated, postBookmarkItemsHandler],
		'/items/slack': postSlackItemsHandler,
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

function copyEmberItems(req, res) {
	// copy ember items to slack team
	return Item.find({user: 'stevetyler_uk', tags: {$in: ['5718a22b5dff4d1d3c81ae56']}}).then(items => {
	  console.log('ember items found');
	  let itemPromiseArr = items.map(item => {
	    let newSlackItem = {
	      user: 'stevetyler',
	      createdDate: item.createdDate,
	      body: item.body,
	      author: item.author,
	  		isPrivate: false,
	  		type: item.type,
	      slackTeamId: 'T03SSL0FF' // Ember-London team id
	    };
	    console.log('save new ember item', newSlackItem);
	    Item.create(newSlackItem);
	  });
	  return Promise.all(itemPromiseArr);
	}).then(() => {
		res.send({
			items: ['success']
		});
	}).catch(err => {
	  console.log(err);
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
	const teamQuery = {slackTeamId: query.teamId};

	return Item.paginate(teamQuery, { page: query.page, limit: query.limit, sort: { createdDate: -1 } })
	.then((pagedObj) => {
		return makeEmberItems(query.teamId, pagedObj);
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
	}).then((tagsArrIds) => {
		let newQuery = Object.assign({}, teamQuery, {tags: {$all: tagsArrIds}});

		return Item.paginate(newQuery, { page: query.page, limit: query.limit, sort: { createdDate: -1 } });
	}).then((pagedObj) => {
		return makeEmberItems(query.teamId, pagedObj);
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
	const searchQuery = {
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
		e => res.status('400').end()
	);
}

function getTwitterItems(user, options) {
  const emberItems = [];

  return TwitterItemImporter(user, options).then(items => {
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

function assignTags(item, id, type) {
  var body = item.body.toLowerCase();
	var tagQuery = (type === 'slack' ? {slackTeamId: id} : {user: id});

	return Tag.find(tagQuery).then(tags => {
		return tags.reduce((arr, tag) => {
	    if (body.indexOf(tag.name.toLowerCase()) !== -1) {
	      console.log('tag found');
	      arr.push(tag._id);
	    }
			return arr;
	  }, []);
	}).then(tags => {
		if (!tags.length) {
			tags.reduce((arr, tag) => {
				if (tag.name === 'unassigned') {
					arr.push(tag._id);
				}
				return arr;
			}, []);
		}
	});
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

function saveChromeItemHandler() {

}

function saveChromeItem (req, res) {
	const urlArr = req.body.urlarr;
	const titleArr = req.body.titlearr;
	let body = urlArr.length > 1 ? '<span>' + 'Tab URLs saved: ' + '</span>' : '';

	let bodyArr = urlArr.map((url, i) => {
		return '<a class="chrome-ext" href="' + url + '" >' + titleArr[i] + '</a>';
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

	User.findOne({id: req.body.username, email: req.body.email}).then(user => {
		if (!user) {
			res.status('401').send();
			return;
		}
		Tag.findOne({user: user.id, name: 'unassigned'}).then(tag => {
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

				return newItem.save();
			}
		});
	}).then((newItem) => {
		console.log('chrome item saved', newItem);
		res.send({'item': newItem});
		return;
	})
	.catch(() => {
		res.status(401).end();
		return;
	});
}

function containsUrl(message) {
	return /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig.test(message);
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
		return Promise.all(tagPromisesArr); // errors if you don't return?
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
  const body = '<a href="' + bookmark.url + '" ">' + bookmark.name + '</a>';
  let tagnames;

	if (bookmark.tags.length) {
		tagnames = bookmark.tags.map((tag, i) => {
	    return bookmark.tags[bookmark.tags.length -1 -i]; // reverse tags
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
	    author: userId,
	    tags: ids,
	    isPrivate: false,
	    type: 'bookmark'
		});
	});
}

function postSlackItemsHandler(req, res) {
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
	}).then(tag => {
		unassignedTagId = tag._id;
	}).then(() => {
		return Tag.findOne({name:message.channel_name, slackChannelId: message.channel_id});
	}).then(function(tag) {
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
	}).then(tag => {
		if (tag) {
			Object.assign(slackItem, {tags: [tag._id, unassignedTagId]});
		}
	}).then(function() {
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
