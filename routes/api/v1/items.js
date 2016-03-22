var logger = require('nlogger').logger(module);
var Twitter = require('twitter');
var MetaInspector = require('node-metainspector');
var textSearch = require('mongoose-text-search');

var db = require('../../../database/database');
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
var configAuth = require('../../../auth');
var ItemImporter = require("../../../lib/import-items.js");

var User = db.model('User');
var Item = db.model('Item');
var Tag = db.model('Tag');

module.exports.autoroute = {
	get: {
		'/items': getItems,
		'/items/get-title': getTitle,
	},
	post: {
		'/items': [ensureAuthenticated, postItems]
	},
	put: {
		'/items/:id': [ensureAuthenticated, putItems]
	},
	delete: {
		'/items/:id': [ensureAuthenticated, deleteItems]
	}
};

function getItems(req, res) {
  if (req.query.operation === 'userItems') {
    getUserItems(req, res);
  }
  else if (req.query.operation === 'filterItems') {
  	getFilteredItems(req, res);
  }
	else if (req.query.operation === 'searchItems') {
		getSearchItems(req, res);
	}
  else if (req.query.operation === 'importItems') {
    getTwitterItems(req, res);
  }
  else {
    return res.status(500).end();
  }
}

function getTitle(req, res) {
	//console.log('get title called', req.query.data);
  var client = new MetaInspector(req.query.data, { timeout: 5000 });
	//var title;

	client.on("fetch", function(){
		if (client) {
			var title = client.title + ' | Link';
			//console.log('title', title);
			return res.send(title);
		}
    //console.log("Links: " + client.links.join(","));
  });
  client.on("error", function(err){
			return res.status('404').end();
  });
  client.fetch();
}

function getUserItems(req, res) {
  var emberItems = [];
  var privateTags = [];

	Tag.find({user: req.query.user, isPrivate: 'true'}, function(err, tags) {
		if (tags) {
			tags.forEach(function(tag) {
				privateTags.push(tag.id);
			});
		}
	})
	.exec().then(function() {
		Item.find({user: req.query.user}, function(err, items) {
	    if (err) {
	      return res.status(404).end();
	    }
	    items.forEach(function(item) {
				var isPrivate = false;
				var itemTags = item.tags;
				var emberItem;

				for (var i = 0; i < privateTags.length; i++) {
					if (item.tags.indexOf(privateTags[i]) !== -1) {
						isPrivate = true;
					}
				}
				emberItem = {
	        id: item._id,
	        user: item.user,
	        body: item.body,
	        createdDate: item.createdDate,
	        author: item.author,
	        tags: item.tags,
					isPrivate: isPrivate
	      };
	      emberItems.push(emberItem);
	    });
	    return res.send({'items': emberItems});
	  });
	});
}

// create method to find private tags
function getFilteredItems(req, res) {
  var tagIds = req.query.tags.toString().split('+');
  var emberItems = [];
  var query = {user: req.query.user, tags: {$all:tagIds}};
  // console.log(tagIds);

  Item.find(query, function(err, items) {
    if (err) {
      // console.log('sending 404');
      return res.status(404).end();
    }
    items.forEach(function(item) {
      var emberItem = {
        id: item._id,
        user: item.user,
        body: item.body,
        createdDate: item.createdDate,
        author: item.author,
        tags: item.tags,
				isPrivate: false
      };
      emberItems.push(emberItem);
    });
    return res.send({'items': emberItems});
  });
}

function getSearchItems(req, res) {
	var string = req.query.search;

	//var query = {user: req.query.user, body: {$in:search}};

	Item.find(query, function(err, items) {
    if (err) {
      // console.log('sending 404');
      return res.status(404).end();
    }
    items.forEach(function(item) {
      var emberItem = {
        id: item._id,
        user: item.user,
        body: item.body,
        createdDate: item.createdDate,
        author: item.author,
        tags: item.tags
      };
      emberItems.push(emberItem);
    });
    return res.send({'items': emberItems});
  });
}

function getTwitterItems(req, res) {
  var emberItems = [];

  //console.log('Get Twitter Items');
  //console.log(req.user.twitterAccessToken, req.user.twitterSecretToken);

  ItemImporter.importItems(req.user, req.query.options, function(err, items) {
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

function postItems(req, res) {
	var item = {
    user: req.body.item.user,
    createdDate: req.body.item.createdDate,
    body: req.body.item.body,
    author: req.body.item.author,
    tags: req.body.item.tags
  };

  if (req.user.id === req.body.item.user) {
    var newItem = new Item(item);

    newItem.save(function(err, item) {
      if (err) {
        // sends different error from browser to identify origin
        res.status(501).end();
      }
      // copy of item
      var emberItem = {
        id: item._id, // created by Mongo when save is called
        user: item.user,
        body: item.body,
        createdDate: item.createdDate,
        author: item.author,
        tags: item.tags
      };
      console.log('Item created with id ' + item._id);
      return res.send({'item': emberItem});
    }).then(function() {
      // add undefined tag
    });
  }
  else {
    return res.status(401).end();
  }
}

function putItems(req, res) {
	if (req.user.id === req.body.item.user) {
		Item.update(
	    {_id: req.params.id},
	    {$set: {tags: req.body.item.tags}},
	    function(err) {
	      if (err) {
	        console.log(err);
	        return res.status(401).end();
	      }
	    return res.send({});
	    }
	  );
	}
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
