// var exports = module.exports = {};
var db = require('../../../database/database');
var logger = require('nlogger').logger(module);
var router = require('express').Router(); // Router middleware

// import ensureAuthenticated middleware
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
var Twitter = require('twitter');
var configAuth = require('./../../../auth');

var User = db.model('User');
var Item = db.model('Item');
var Tag = db.model('Tag');

var ItemImporter = require("../../../lib/import-items.js");
  
/*
* Requesting items for myItems or user page
*/

router.get('/', function(req, res) {
  console.log(req.query.operation);
  if (req.query.operation === 'myItems') {
    // logger.info('GET items for myItems');
    getMyItems(req, res);
  } else if (req.query.operation === 'userItems') {
    // logger.info('GET items for user/index route');
    getUserItems(req, res);
  } else if (req.query.operation === 'filterItems') {
    // logger.info('GET items for user/index route');
    getFilteredItems(req, res);
  } else if (req.query.operation === 'importItems') {
    getTwitterItems(req, res);
  }
  else {
    return res.status(500).end();
  }
});

/*
* Creating an item from myItems
*/

router.post('/', ensureAuthenticated, function(req, res) {
  var item = {
    user: req.body.item.user,
    createdDate: req.body.item.createdDate,
    body: req.body.item.body,
    author: req.body.item.author,
    tags: ['Undefined']
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
});

router.put('/:id', ensureAuthenticated, function(req, res) {
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
});

router.delete('/:id', ensureAuthenticated, function(req, res) {
  Item.remove({ _id: req.params.id }, function (err) {
    if (err) {
      console.log(err);
      return res.status(401).end();
    }
    return res.send({});
  });
});

function getMyItems (req, res) {
  var emberItems = [];
  var emberTags = [];
  var query = {user: req.query.user};
  
  console.log(req);

  Item.find(query, function(err, items) {
    if (err) {
      console.log(query);
      return res.status(404).end();
    }
    // Mongo requires _id value
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

function getUserItems(req, res) {
  var emberItems = [];
  var query = {user: req.query.user};

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
        tags: item.tags
      };
      emberItems.push(emberItem);
    });
    return res.send({'items': emberItems});
  });
}


function getTwitterItems(req, res) {
  var emberItems = [];

  console.log('Get Twitter Items');
  console.log(req.user.twitterAccessToken, req.user.twitterSecretToken);
  
  // manual import, pass whole user not just id which is inefficient
  ItemImporter.importItems(req.user, function(err, items) {
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

module.exports = router;


