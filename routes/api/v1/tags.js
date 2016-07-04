var async = require('async');

var db = require('../../../database/database');
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

var Item = db.model('Item');
var Tag = db.model('Tag');
var User = db.model('User');

module.exports.autoroute = {
	get: {
		'/tags' : getTags
	},
	post: {
		'/tags': [ensureAuthenticated, postTag]
	},
	put: {
		'/tags/:id': [ensureAuthenticated, putTag]
	},
	delete: {
		'/tags/:id': [ensureAuthenticated, deleteTag]
	}
};

function getTags(req, res){
  var id = req.query.userId;
  var teamId;
  var allEmberTags = [];
  var publicEmberTags = [];

	if (!id) {
		return res.status(404).end();
	}
	return User.findOne({id: id}, function(err, user) {
		if (user) {
			teamId = user.slackProfile.teamId;
		}
	}).exec().then(function() {
		return Tag.findOne({id: 'undefined', user: id}, function(tag){
			if (!tag) {
				Tag.create({
					id: 'undefined',
					colour: 'cp-colour-1',
					user: id,
					itemCount: 0
				});
			}
		});
	})
	.then(function() {
		return User.findOne({id: id}, function(err, user) {
			if (user) {
				teamId = user.slackProfile.teamId;
			}
		});
	})
	.then(function() {
		if (teamId) {
			return Tag.find({slackTeamId: teamId}, function(err, tags) {
				if (err) {
					return res.status(404).end();
				}
				makeEmberTags(req, res, id, allEmberTags, publicEmberTags, tags);
			});
		} else {
			return Tag.find({user: id}, function(err, tags) {
				if (err) {
					return res.status(404).end();
				}
				makeEmberTags(req, res, id, allEmberTags, publicEmberTags, tags);
			});
		}
	})
	.then(null, function() {
		return res.status(404).end();
	});
}

function makeEmberTags(req, res, id, allEmberTags, publicEmberTags, tags) {
  async.each(tags, function(tag, done) {
    Item.count({user: id, tags: {$in: [tag.id]}}, function(err, count) {
      if (err) {
        return res.status(404).end();
      }
      var emberTag = tag.makeEmberTag(count);

      if (tag.isPrivate === 'true') {
        allEmberTags.push(emberTag);
      } else {
        allEmberTags.push(emberTag);
        publicEmberTags.push(emberTag);
      }
      done();
    });
  }, function(err) {
    if (err) {
      console.log(err);
    }
    if (!req.user) {
      return res.send({'tags': publicEmberTags});
    }
    else if (req.user.id === req.query.user) {
      return res.send({'tags': allEmberTags});
    }
    else {
      return res.send({'tags': publicEmberTags});
    }
  });
}

function postTag(req, res){
  var newTag;

	if (req.user.id === req.body.tag.user) {
		var tag = {
			id: req.body.tag.id,
			colour: req.body.tag.colour,
			user: req.body.tag.user,
			isPrivate: req.body.tag.isPrivate
		};
		if (req.body.tag.id) {
			Tag.findOne({id: req.body.tag.id, user: req.body.tag.user}, function(err, data) {
				if (data) {
					res.status(400).end();
				} else {
					newTag = new Tag(tag);
					newTag.save(function(err, tag) {
						if (err) {
							res.status(501).end();
						}
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

function putTag(req, res) {
  var tagId = req.params.id;
  var isPrivate = req.body.tag.isPrivate;

  if (req.user.id === req.body.tag.user) {
    Tag.update({id: tagId, user: req.user.id},
      {$set: {
        //id: req.body.tag.newId, // set new id on items as well
        colour: req.body.tag.colour,
        isPrivate: req.body.tag.isPrivate
        }
      }
    ).exec().then(function() {
      Item.find({user: req.user.id, tags: {$in: [tagId]}}, function(err, items) {
        if (err) {
          return res.status(404).send();
        }
        items.forEach(function(item) {
          item.isPrivate = isPrivate;
          return item.save();
        });
      });
    })
    .then(function() {
      return res.send({});
    })
    .then(null, function(err) {
      console.log(err);
      return res.status(401).end();
    });
  }
}

function deleteTag(req, res){
  Tag.remove({ id: req.params.id }, function (err) {
    if (err) {
      console.log(err);
      return res.status(404).end();
    }
    return res.send({});
  });
}
