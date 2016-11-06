'use strict';
const db = require('../../../database/database');
const ensureAuthenticated = require('../../../middlewares/ensure-authenticated').ensureAuthenticated;

//const Item = db.model('Item');
const Category = db.model('Category');
//const UserGroup = db.model('UserGroup');

module.exports.autoroute = {
	get: {'/categories' : getCategories},
	post: {'/categories': [ensureAuthenticated, postCategory]},
	// put: {'/categories/:id': [ensureAuthenticated, putCategory]},
	// delete: {'/categories/:id': [ensureAuthenticated, deleteCategory]}
};

function getCategories(req, res){
	//if (req.query.operation === 'userCategories') { getUserCategories(req, res); }
	if (req.query.operation === 'groupCategories') { getGroupCategories(req, res); }
}

function getGroupCategories(req, res) {
	const groupId = req.query.groupId;
	console.log('slack tags', groupId);

	if (!groupId) {
		return res.status(404).end();
	}
	Category.find({userGroup: groupId}).exec().then((categories) => {
		if (categories) {
			return makeEmberCategory(groupId, categories, 'slack');
		}
	}).then((obj) => {
		res.send({ tags: obj.all });
	}, () => {
		return res.status(404).end();
	});
}

function postCategory() {

}

function makeEmberCategory() {
	
}


// function getUserTags(req, res) {
// 	const id = req.query.userId;
//
// 	if (!id) {
// 		return res.status(404).end();
// 	}
// 	Tag.findOne({name: 'unassigned', user: id}).exec().then((tag) => {
// 		if (typeof tag !== 'object') {
// 			Tag.create({
// 				name: 'unassigned',
// 				colour: 'cp-colour-1',
// 				user: id,
// 				itemCount: 0
// 			});
// 		}
// 	}).then(() => {
// 		return Tag.find({user: id});
// 	}).then((tags) => {
// 		if (tags) {
// 			return makeEmberTags(id, tags, 'user');
// 		}
// 	}).then((obj) => {
// 	  if (!req.user) {
// 			return obj.public;
// 	  } else if (req.user.id === req.query.userId) {
// 			return obj.all;
// 	  } else {
// 	    return obj.public;
// 	  }
// 	}).then((tags) => {
// 		res.send({ tags: tags });
// 	}, () => {
// 		return res.status(404).end();
// 	});
// }
//
// function makeEmberTags(id, tags, type) {
// 	let tagPromises;
//
// 	if (type === 'user') {
// 		tagPromises = tags.map(tag => Item.count({ user: id, tags: { $in: [ tag._id ] }}));
// 	}	else if (type === 'slack') {
// 		tagPromises = tags.map(tag => Item.count({ userGroup: id, tags: {$in: [tag._id] }}));
// 	}
// 	if (tagPromises) {
// 		return Promise.all(tagPromises).then(counts => {
// 			return tags.reduce((obj, tag, i) => {
// 				const emberTag = tag.makeEmberTag(counts[i]);
// 				return tag.isPrivate === 'true' ?
// 					{
// 						all: obj.all.concat(emberTag),
// 						public: obj.public } :
// 					{
// 						all: obj.all.concat(emberTag),
// 						public: obj.public.concat(emberTag),
// 					};
// 			}, { all: [], public: [] });
// 		});
// 	}	else {
// 		return { all: [], public: [] };
// 	}
// }
//

//
// function postTag(req, res){
// 	if (req.body.tag.userGroup) {
// 		postGroupTagHandler(req, res);
// 		return;
// 	}
// 	if (req.user.id === req.body.tag.user) {
// 		postUserTagHandler(req, res);
// 		return;
// 	}
// 	else {
// 		res.status(401).end();
// 		return;
// 	}
// }
//
// function postGroupTagHandler(req, res) {
// 	const tag = req.body.tag;
//
// 	// need to check adminPermissions with user id
// 	UserGroup.findOne({id: tag.userGroup}).then(group => {
// 		if (typeof group === 'object') {
// 			// console.log('group found', group);
// 			return saveTag(req.body.tag);
// 		}
// 		res.status(401).end();
// 		return;
// 	}).then(tag => {
// 		let emberTag = tag.makeEmberTag();
//
// 		res.send({'tag': emberTag});
// 		return;
// 	}).catch(err => {
// 		console.log(err);
// 		res.status(401).end();
// 		return;
// 	});
// }
//
// function postUserTagHandler(req, res) {
// 	saveTag(req.body.tag).then(tag => {
// 		let emberTag = tag.makeEmberTag();
//
// 		res.send({'tag': emberTag});
// 		return;
// 	}).catch(err => {
// 		console.log(err);
// 		res.status(401).end();
// 		return;
// 	});
// }
//
// function saveTag(tag) {
// 	return Tag.create({
// 		name: tag.name,
// 		colour: tag.colour,
// 		isPrivate: tag.isPrivate,
// 		slackChannelId: tag.slackChannelId,
// 		slackTeamId: tag.slackTeamId,
// 		user: tag.user,
// 		userGroup: tag.userGroup,
// 	});
// }
//
// function putTag(req, res) {
//   const tagId = req.params.id;
//   const isPrivate = req.body.tag.isPrivate;
// 	const tagName = req.body.tag.name;
//
// 	console.log('putTag', tagId, tagName);
//   if (req.user.id === req.body.tag.user || req.user.slackProfile.isTeamAdmin) {
//     Tag.update({_id: tagId}, // removed user: req.user.id temporarily
//       {$set: {
//         name: tagName,
//         colour: req.body.tag.colour,
//         isPrivate: req.body.tag.isPrivate
//         }
//       }
//     ).then(() => {
//       Item.find({user: req.user.id, tags: {$in: [tagId]}}, (err, items) => {
//         if (err) {
//           return res.status(404).send();
//         }
//         items.forEach((item) => {
//           item.isPrivate = isPrivate;
//           return item.save();
//         });
//       });
//     }).then(() => {
//       return res.send({});
//     }).then(null, (err) => {
//       console.log(err);
//       return res.status(400).end();
//     });
//   }	else {
// 		console.log('userId', req.user.id, 'tag user', req.body.tag.user, req.user.slackProfile.isTeamAdmin);
// 		return res.status(401).end();
// 	}
// }
//
// function deleteTag(req, res){
//   Tag.remove({ _id: req.params.id }).exec().then(() => {
//     return res.send({});
//   }).then(null, (err) => {
// 		console.log(err);
// 		return res.status(500).end();
// 	});
// }
