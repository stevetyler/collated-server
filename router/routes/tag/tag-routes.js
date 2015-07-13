// var exports = module.exports = {};
var db = require('../../../database/database');
var logger = require('nlogger').logger(module);
var router = require('express').Router(); // Router middleware

// import ensureAuthenticated middleware
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

var User = db.model('User');
var Tag = db.model('Tag');

/*
* Requesting tags for myFavs or user page
*/

router.get('/', function(req, res) {
  // console.log(req.query.operation);
  // if (req.query.operation === 'myFavs') {
  //   // logger.info('GET favs for myFavs');
  //   getMyFavs(req, res);
  // } else if (req.query.operation === 'userFavs') {
  //   // logger.info('GET favs for user/index route');
  //   getUserFavs(req, res);
  // } else if (req.query.operation === 'importFavs') {

  //   getTwitterFavs(req, res);
  // }
  // else {
  //   return res.status(500).end();
  // }
});

/*
* Creating a tag from myFavs
*/

router.post('/', ensureAuthenticated, function(req, res) {
  var tag = {
    user: req.body.tag.user,
    name: req.body.tag.name,
    colour: req.body.tag.colour
  };

  if (req.user.id === req.body.tag.user) {
    var newTag = new Tag(tag);

    newTag.save(function(err, tag) {
      if (err) {
        // sends different error from browser to identify origin
        res.status(501).end();
      }
      // copy of tag
      var emberTag = {
        id: tag._id, // created by Mongo when save is called
        user: tag.user,
        name: tag.name,
        colour: tag.colour
      };
      console.log('Tag created with name ' + tag.name);
      console.log('Tag created with colour ' + tag.colour);
      return res.send({'tag': emberTag});
    });
  }
  else {
    return res.status(401).end();
  }
});

router.delete('/:id', ensureAuthenticated, function(req, res) {
  Tag.remove({ _id: req.params.id }, function (err) {
    if (err) {
      console.log(err);
      return res.status(404).end();
    }
    return res.send({});
  });
});


// function getMyFavs (req, res) {
//   var emberFavs = [];
//   var query = {user: req.query.user};
//   // var query = {user: 'stevetyler_uk'};
  
//   console.log(req);

//   Fav.find(query, function(err, favs) {
//     if (err) {
//       console.log(query);
//       return res.status(404).end();
//     }
//     // Mongo requires _id value
//     favs.forEach(function(fav) {
//       var emberFav = {
//         id: fav._id,
//         user: fav.user,
//         body: fav.body,
//         createdDate: fav.createdDate,
//         author: fav.author
//       };
//       emberFavs.push(emberFav);
//     });
//     return res.send({'favs': emberFavs});
//   });
// }

// function getUserFavs(req, res) {
//   var emberFavs = [];
//   var query = {user: req.query.user};

//   Fav.find(query, function(err, favs) {
//     if (err) {
//       // console.log('sending 404');
//       return res.status(404).end();
//     }
//     favs.forEach(function(fav) {
//       var emberFav = {
//         id: fav._id,
//         user: fav.user,
//         body: fav.body,
//         createdDate: fav.createdDate,
//         author: fav.author
//       };
//       emberFavs.push(emberFav);
//     });
//     return res.send({'favs': emberFavs});
//   });
// }



module.exports = router;


