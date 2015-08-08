// var exports = module.exports = {};
var db = require('../../../database/database');
var logger = require('nlogger').logger(module);
var router = require('express').Router(); // Router middleware

// import ensureAuthenticated middleware
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;
var Twitter = require('twitter');
var configAuth = require('./../../../auth');

var User = db.model('User');
var Fav = db.model('Fav');
var Tag = db.model('Tag');

var FavImporter = require("../../../lib/import-favs.js");
  
/*
* Requesting favs for myFavs or user page
*/

router.get('/', function(req, res) {
  console.log(req.query.operation);
  if (req.query.operation === 'myFavs') {
    // logger.info('GET favs for myFavs');
    getMyFavs(req, res);
  } else if (req.query.operation === 'userFavs') {
    // logger.info('GET favs for user/index route');
    getUserFavs(req, res);
  } else if (req.query.operation === 'importFavs') {
    getTwitterFavs(req, res);
  }
  else {
    return res.status(500).end();
  }
});

/*
* Creating a fav from myFavs
*/

router.post('/', ensureAuthenticated, function(req, res) {
  var fav = {
    user: req.body.fav.user,
    createdDate: req.body.fav.createdDate,
    body: req.body.fav.body,
    author: req.body.fav.author,
    // tags: ['Undefined']
  };

  if (req.user.id === req.body.fav.user) {
    var newFav = new Fav(fav);

    newFav.save(function(err, fav) {
      if (err) {
        // sends different error from browser to identify origin
        res.status(501).end();
      }
      // copy of fav
      var emberFav = {
        id: fav._id, // created by Mongo when save is called
        user: fav.user,
        body: fav.body,
        createdDate: fav.createdDate,
        author: fav.author
      };
      console.log('Fav created with id ' + fav._id);
      return res.send({'fav': emberFav});
    }).then(function() {

      // add undefined tag

    });
  }
  else {
    return res.status(401).end();
  }
});

router.delete('/:id', ensureAuthenticated, function(req, res) {
  Fav.remove({ _id: req.params.id }, function (err) {
    if (err) {
      console.log(err);
      return res.status(404).end();
    }
    return res.send({});
  });
});

function getMyFavs (req, res) {
  var emberFavs = [];
  var emberTags = [];
  var query = {user: req.query.user};
  
  console.log(req);

  Fav.find(query, function(err, favs) {
    if (err) {
      console.log(query);
      return res.status(404).end();
    }
    // Mongo requires _id value
    favs.forEach(function(fav) {
      var emberFav = {
        id: fav._id,
        user: fav.user,
        body: fav.body,
        createdDate: fav.createdDate,
        author: fav.author,
        tags: fav.tags
      };
      emberFavs.push(emberFav);
    });
    return res.send({'favs': emberFavs});
    // find all user tags, then fav tags
    // Tag.find(query, function(err, tags) {
    //   if (err) {
    //     res.status(403).end();
    //   }
    //   tags.forEach(function(tag) {
    //     var emberTag = {
    //       id: tag._id,
    //       user: tag.user,
    //       name: tag.name,
    //       colour: tag.colour
    //     };
    //     emberTags.push(emberTag);
    //     return res.send({'favs': emberFavs, 'tags': emberTags});
    //   });
    // });
  });
}

function getUserFavs(req, res) {
  var emberFavs = [];
  var query = {user: req.query.user};

  Fav.find(query, function(err, favs) {
    if (err) {
      // console.log('sending 404');
      return res.status(404).end();
    }
    favs.forEach(function(fav) {
      var emberFav = {
        id: fav._id,
        user: fav.user,
        body: fav.body,
        createdDate: fav.createdDate,
        author: fav.author
      };
      emberFavs.push(emberFav);
    });
    return res.send({'favs': emberFavs});
  });
}


function addTagId(favId, tagId, done) {
  Fav.findOneAndUpdate(
    {id: favId},
    {$push: {tags: tagId}},

    function(err, fav) {
      if (err) {

      }
    }
  );
}

function removeTagId(tagId, loggedInUserId, done) {


}

function getTwitterFavs(req, res) {
  var emberFavs = [];

  console.log('Get Twitter Favs');
  console.log(req.user.twitterAccessToken, req.user.twitterSecretToken);
  
  // manual import, pass whole user not just id which is inefficient
  FavImporter.importFavs(req.user, function(err, favs) {
    if (err) {
      return res.status(400).end();
    }
    favs.forEach(function(fav) {
      var emberFav = {
        id: fav._id,
        author: fav.author,
        user: fav.user,
        body: fav.body,
        createdDate: fav.createdDate
      };
      emberFavs.push(emberFav);
    });
    return res.send({'favs': emberFavs});
  });
}

module.exports = router;


