var MetaInspector = require('node-metainspector');

var db = require('../../../database/database');
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
var ItemImporter = require('../../../lib/import-items.js');

var Item = db.model('Item');
var Tag = db.model('Tag');

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
		case 'filterItems':
			return getFilteredItems(req, res);
		case 'importItems':
			return getTwitterItems(req, res);
		default:
			return res.status(500).end();
	}
  return res.status(500).end();
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
	var query = {user: req.query.user};

	makeEmberItems(req, res, query);
}

function getFilteredItems(req, res) {
  var tagIds = req.query.tags.toString().split('+');
  var query = {
		user: req.query.user,
		tags: {$all:tagIds}
	};
  makeEmberItems(req, res, query);
}

function getSearchItems(req, res) {
	var string = req.query.keyword;
	var query = {
		user: req.query.user,
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
			var emberItem;

			emberItem = {
				id: item._id,
				user: item.user,
				body: item.body,
				createdDate: item.createdDate,
				author: item.author,
				tags: item.tags,
				isPrivate: item.isPrivate,
				twitterTweetId: item.twitterTweetId
			};
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
		else if (req.user.id === req.query.user) {
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
      var emberItem = {
        id: item._id,
        author: item.author,
        user: item.user,
        body: item.body,
        createdDate: item.createdDate,
        tags: item.tags
      };
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
		        return res.status(401).end();
		      }
		    return res.send({});
		    }
		  );
		});
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
		isPrivate: false
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
	        res.status(501).end();
	      }
	      var emberItem = {
	        id: item._id,
	        user: item.user,
	        body: item.body,
	        createdDate: item.createdDate,
	        author: item.author,
	        tags: item.tags,
					isPrivate: item.isPrivate
	      };
	      return res.send({'item': emberItem});
	    });
	  }
	  else {
	    return res.status(401).end();
	  }
	});
}

function postSlackItem(req, res) {
	var tags = [req.body.channel_name];
	var slackItem = {
    user: req.body.user_name,
    createdDate: req.body.timestamp,
    body: req.body.text,
    // author: req.body.item.author,
    tags: tags,
  };

	Tag.find({id: {$in: tags}, user: req.user.id, isPrivate: 'true'}).exec().then(function(tags) {
		if (!tags) {
			var newTag = {
				id: req.body.channel_name,
				slackChannelId: req.body.channel_id,
			};
			Tag.save(newTag);
		}
	}).then(function() {
		if (req.user.id === req.body.item.user) {
	    var newItem = new Item(slackItem);

	    newItem.save(function(err, slackItem) {
	      if (err) {
	        res.status(501).end();
	      }
	      var emberItem = {
	        id: slackItem._id,
	        user: slackItem.user,
	        body: slackItem.body,
	        createdDate: slackItem.createdDate,
	        author: slackItem.author,
	        tags: slackItem.tags,
	      };
	      return res.send({'item': emberItem});
	    });
	  }
	  else {
	    return res.status(401).end();
	  }
	});

	console.log('body', req.body);
}

function deleteItems(req, res) {
	Item.remove({ _id: req.params.id }, function (err) {
    if (err) {
      console.log(err);
      return res.status(401).end();
    }
    return res.send({});
  });
}
