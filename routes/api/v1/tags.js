var async = require('async');
var db = require('../../../database/database');
var logger = require('nlogger').logger(module);
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

var User = db.model('User');
var Tag = db.model('Tag');
var Item = db.model('Item');

module.exports.autoroute = {
	get: {
		'/tags' : getTags
	},
	post: {
		'/tags': [ensureAuthenticated, postTags]
	},
	delete: {
		'/tags/:id': [ensureAuthenticated, deleteTag]
	}
};

// function countItems(tag) {
// 	Item.count({tags: {$in: [tag]}}, function(err, count) {
// 		if (err) {
// 			return res.status(404).end();
// 		}
// 		return count;
// 	});
// }

function getTags(req, res){
	var emberTags = [];
	var id = req.query.user;

	Tag.find({user: id}, function(err, tags) {
		if (err) {
			return res.status(404).end();
		}
		async.each(tags, function(tag, done) {
			Item.count({user: id, tags: {$in: [tag.id]}}, function(err, count) {
				if (err) {
					return res.status(404).end();
				}
				var emberTag = {
					id: tag.id,
					colour: tag.colour,
					user: tag.user,
					itemCount: count
				};
				//console.log('emberTags inner', emberTags.length); // ok
				emberTags.push(emberTag);
				done();
			});
		}, function(err) {
			if (err) {
				console.log(err);
			}
			//console.log('emberTags outer', emberTags.length);
			return res.send({'tags': emberTags});
		});
	});
}

function postTags(req, res){
	var newTag;

  if (req.user.id === req.body.tag.user) {
    var tag = {
      id: req.body.tag.id,
      colour: req.body.tag.colour,
      user: req.body.tag.user
    };

    if (req.body.tag.id) {
      Tag.findOne({id: req.body.tag.id, user: req.body.tag.user}, function(err, data) {
        if (data) {
          // tag already exists
          res.status(400).end();
        }
        else {
          newTag = new Tag(tag);
          newTag.save(function(err, tag) {
            if (err) {
              res.status(501).end();
            }
            // copy of tag, needed?
            // var emberTag = {
            //   id: tag.id,
            //   colour: tag.colour
            // };
            return res.send({'tag': tag});
          });
        }
      });
    }
  }
  else {
    return res.status(401).end();
  }
}

function deleteTag(req, res){
	if (req.user.id === req.body.tag.user) {
		Tag.remove({ id: req.params.id }, function (err) {
	    if (err) {
	      console.log(err);
	      return res.status(404).end();
	    }
	    return res.send({});
	  });
	}
}
