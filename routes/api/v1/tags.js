var async = require('async');

var db = require('../../../database/database');
var ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

var Item = db.model('Item');
var Tag = db.model('Tag');
var User = db.model('User');

module.exports.autoroute = {
	get: {
		'/tags' : getTags,
		//'/tags/slack' : getSlackTags // not in use
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

	//console.log('get tags user', id);
	Tag.findOne({id: 'undefined', user: id}).exec().then(function(tag){
		console.log('then1');
		if (!tag) {
			console.log('tag created called');
			return Tag.create({
				id: 'undefined',
				colour: 'cp-colour-1',
				user: id,
				itemCount: 0
			});
		}
	})
	.then(function() {
		console.log('then2', id);
		//var userId = id;
		return User.findOne({id: id}, function(err, user) {
			console.log('then2 user findOne', id, user);
			if (user) {
				teamId = user.slackProfile.teamId;
				console.log('slack team id found', teamId);
			}
		});
	})
	.then(function() {
		console.log('then3 teamId', teamId);
		if (teamId) {
			return Tag.find({slackTeamId: teamId}, function(err, tags) {
				if (err) {
					return res.status(404).end();
				}
				console.log('then3 slack tags found', tags);
				//makeEmberTags(req, res, id, tags, allEmberTags, publicEmberTags);
				return async.each(tags, function(tag, done) {
					return Item.count({user: id, tags: {$in: [tag.id]}}, function(err, count) {
						console.log('then3 slack items', count);
						if (err) {
							return res.status(404).end();
						}
						var emberTag = tag.makeEmberTag(count);

						allEmberTags.push(emberTag);
						console.log('then3 all tags', allEmberTags);
						done();
					});
				}, function(err) {
					if (err) {
						console.log(err);
					}
				});
			});
		}
	})
	.then(function() {
		console.log('then4', id);
		return Tag.find({user: id}, function(err, tags) {
			console.log('then4 tags found', tags);
			if (err) {
				return res.status(404).end();
			}
			makeEmberTags(req, res, id, allEmberTags, publicEmberTags, tags);
		});
	});
}

function makeEmberTags(req, res, id, allEmberTags, publicEmberTags, tags) {
	async.each(tags, function(tag, done) {
		Item.count({user: id, tags: {$in: [tag.id]}}, function(err, count) {
			if (err) {
				return res.status(404).end();
			}
			var emberTag = tag.makeEmberTag(count);
			console.log('ember tag created', emberTag);

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

// function getSlackTags(req, res){
//	 var id = req.query.userId;
//	 var teamId;
//	 var allEmberTags = [];
//
//	 User.findOne({id: id}, function(err, user) {
//		 console.log('then1 user findOne', id, user);
//		 if (user) {
//			 teamId = user.slackProfile.teamId;
//			 console.log('slack team id found', teamId);
//		 }
//	 }).exec().then(function() {
//		 console.log('then3 teamId', teamId);
//		 if (teamId) {
//			 Tag.find({slackTeamId: teamId}, function(err, tags) {
//				 if (err) {
//					 return res.status(404).end();
//				 }
//				 console.log('then3 slack tags found', tags);
//				 async.each(tags, function(tag, done) {
//					 Item.count({user: id, tags: {$in: [tag.id]}}, function(err, count) {
//						 console.log('then3 slack items', count);
//						 if (err) {
//							 return res.status(404).end();
//						 }
//						 var emberTag = tag.makeEmberTag(count);
//
//						 allEmberTags.push(emberTag);
//						 console.log('then3 all tags', allEmberTags);
//						 done();
//					 });
//				 }, function(err) {
//					 if (err) {
//						 console.log(err);
//					 }
//				 });
//			 });
//		 }
//	 });
// }
