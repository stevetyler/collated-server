"use strict";
const db = require('../../../database/database');
const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

const Item = db.model('Item');
const Tag = db.model('Tag');

module.exports.autoroute = {
	get: {'/tags' : getTags},
	post: {'/tags': [ensureAuthenticated, postTag]},
	put: {'/tags/:id': [ensureAuthenticated, putTag]},
	delete: {'/tags/:id': [ensureAuthenticated, deleteTag]}
};

function getTags(req, res){
	if (req.query.operation === 'userTags') { getUserTags(req, res); }
	if (req.query.operation === 'slackTeamTags') { getSlackTeamTags(req, res);} }

// function createDefaultTags(id) {
// 	return Tag.findOne({id: 'undefined', user: id}).exec().then(function(tag) {
// 		if (!tag) {
// 			Tag.create({
// 				id: 'undefined',
// 				colour: 'cp-colour-1',
// 				user: id,
// 				itemCount: 0
// 			});
// 		}
// 	});
// }

function getUserTags(req, res) {
	const id = req.query.userId;

	if (!id) {
		return res.status(404).end();
	}
	Tag.findOne({id: 'undefined', user: id}).exec().then((tag) => {
		if (!tag) {
			Tag.create({
				id: 'undefined',
				colour: 'cp-colour-1',
				user: id,
				itemCount: 0
			});
		}
	})
	.then(() => {
		return Tag.find({user: id});
	})
	.then((tags) => {
		if (tags) {
			return makeEmberTags(id, tags, 'user');
		}
	})
	.then((obj) => {
	  if (!req.user) {
			return obj.public;
	  }
	  else if (req.user.id === req.query.userId) {
			return obj.all;
	  }
	  else {
	    return obj.public;
	  }
	})
	.then((tags) => {
		res.send({ tags: tags });
	}, () => {
		return res.status(404).end();
	});
}

function makeEmberTags(id, tags, type) {
	let tagPromises;

	if (type === 'user') {
		tagPromises = tags.map(tag => Item.count({ user: id, tags: { $in: [ tag.id ] }}));
	}
	else if (type === 'slack') {
		tagPromises = tags.map(tag => Item.count({ slackTeamId: id, tags: {$in: [tag.id] }}));
	}

	return Promise.all(tagPromises).then(counts => {
		return tags.reduce((obj, tag, i) => {
			const emberTag = tag.makeEmberTag(counts[i]);
			return tag.isPrivate === 'true' ?
				{
					all: obj.all.concat(emberTag),
					public: obj.public } :
				{
					all: obj.all.concat(emberTag),
					public: obj.public.concat(emberTag),
				};
		}, { all: [], public: [] });
	});

	//const a = [ 1, 2, 3 ]
	//const b = [ 0, ...a, 4, ...[ 5 ] ]
}

function getSlackTeamTags(req, res) {
	const teamId = req.query.teamId;

	if (!teamId) {
		return res.status(404).end();
	}
	Tag.find({slackTeamId: teamId}).exec().then((tags) => {
		if (tags) {
			return makeEmberTags(teamId, tags, 'slack');
		}
	})
	.then((obj) => {
		res.send({ tags: obj.all });
	}, () => {
		return res.status(404).end();
	});
}

function postTag(req, res){
	if (req.user.id === req.body.tag.user) {
		if (req.body.tag.id) {
			const tag = {
				id: req.body.tag.id,
				colour: req.body.tag.colour,
				user: req.body.tag.user,
				isPrivate: req.body.tag.isPrivate,
				slackChannelId: req.body.tag.slackChannelId,
				slackTeamId: req.body.tag.slackTeamId
			};
			Tag.findOne({id: req.body.tag.id, user: req.body.tag.user}, (err, data) => {
				if (data) {
					res.status(400).end();
				}
				else {
					const newTag = new Tag(tag);
					newTag.save((err, tag) => {
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
  const tagId = req.params.id;
  const isPrivate = req.body.tag.isPrivate;

  if (req.user.id === req.body.tag.user) {
    Tag.update({id: tagId, user: req.user.id},
      {$set: {
        //id: req.body.tag.newId, // set new id on items as well
        colour: req.body.tag.colour,
        isPrivate: req.body.tag.isPrivate
        }
      }
    ).exec().then(() => {
      Item.find({user: req.user.id, tags: {$in: [tagId]}}, (err, items) => {
        if (err) {
          return res.status(404).send();
        }
        items.forEach((item) => {
          item.isPrivate = isPrivate;
          return item.save();
        });
      });
    })
    .then(() => {
      return res.send({});
    })
    .then(null, (err) => {
      console.log(err);
      return res.status(400).end();
    });
  }
	else {
		return res.status(401).end();
	}
}

function deleteTag(req, res){
  Tag.remove({ id: req.params.id }).exec().then(() => {
    return res.send({});
  })
	.then(null, (err) => {
		console.log(err);
		return res.status(500).end();
	});
}
