// var exports = module.exports = {};
var db = require('../../../database/database');
var logger = require('nlogger').logger(module);
var router = require('express').Router(); // Router middleware

// import ensureAuthenticated middleware
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

var User = db.model('User');
var Tag = db.model('Tag');


// Requesting tags for myFavs or user page

router.get('/', function(req, res) {
  if (req.query.operation === 'userTags') {
    // logger.info('GET favs for myFavs');
    handleUserTagsRequest(req, res);
  }
  else {
    return res.status(500).end();
  }
});


// Creating a tag from myFavs

router.post('/', ensureAuthenticated, function(req, res) {
  var tag = {
    id: req.body.tag.id,
    colour: req.body.tag.colour,
    user: req.body.tag.user
  };
  var newTag;

  if (req.body.tag.id) {
    Tag.findOne({id: req.body.tag.id}, function(err, data) {
      if (data) {
        // tag already exists
        res.status(400).end();
      }
      else {
        newTag = new Tag(tag);
        newTag.save(function(err, tag) {
          if (err) {
            // sends different error from browser to identify origin
            res.status(501).end();
          }
          // copy of tag, needed?
          // var emberTag = {
          //   id: tag.id, 
          //   colour: tag.colour
          // };
          console.log('Tag created with name ' + tag.id);
          console.log('Tag created with colour ' + tag.colour);
          console.log('Tag created with user ' + tag.user);
          return res.send({'tag': tag});
        });
      }
    });
  }
  else {
    return res.status(401).end();
  }
});

router.delete('/:id', ensureAuthenticated, function(req, res) {
  Tag.remove({ id: req.params.id }, function (err) {
    if (err) {
      console.log(err);
      return res.status(404).end();
    }
    return res.send({});
  });
});

function handleUserTagsRequest(req, res) {
  var emberTags = [];
  var id = req.query.user;

  Tag.find({user: id}, function(err, tags) {
    if (err) {
      console.log(query);
      return res.status(404).end();
    }
    tags.forEach(function(tag) {
      var emberTag = {
        id: tag.id,
        colour: tag.colour,
        user: tag.user
      };
      console.log('emberTag user ' + emberTag.user);
      emberTags.push(emberTag);
    });
    return res.send({'tags': emberTags});
  });
}

module.exports = router;


