'use strict';
const db = require('../../../database/database');
//const User = db.model('User');
const UserGroup = db.model('UserGroup');

module.exports.autoroute = {
	get: {
		'/userGroups/:id': getUserGroupHandler
	}
};

function getUserGroupHandler(req, res) {
  const queryId = UserGroup.makeGroupId(req.params.id);

	UserGroup.findOne({id: queryId}).then(userGroup => {
		let userUserGroups;
		try {
			userUserGroups = req.user.userGroups || [];
		} catch (err) {
			//console.log('caught error', err);
		}

		if (!userGroup.isPrivate) {
			return userGroup;
		}
		else if (userGroup.isPrivate === 'true' && userUserGroups.indexOf(queryId) !== -1) {
			return userGroup;
		}
	}).then(userGroup => {
		if (userGroup) {
			const emberUserGroup = userGroup.makeEmberUserGroup();

			res.send({'userGroup': emberUserGroup});
		} else {
			res.status(404).end();
		}
		return;
	}).catch(err => {
		res.status(404).end();
		throw new Error(err);
	});
}


// function getUserGroupHandler(req, res) {
//   const queryId = formatGroupId(req.params.id);
// 	const authUser = req.user;
// 	const resObj = {};
//
// 	UserGroup.findOne({id: queryId}).then(userGroup => {
// 		const emberUserGroup = userGroup.makeEmberUserGroup();
//
// 		Object.assign(resObj, {'userGroup': emberUserGroup});
// 		return typeof authUser === 'object' ? User.findOne({id: authUser.id}) : null;
// 	}).then(user => {
// 		const emberUser = user ? user.makeEmberUser() : [];
//
// 		Object.assign(resObj, {'users': emberUser});
// 	}).then(() => {
// 		res.send(resObj);
// 	}).catch(err => {
// 		console.log(err);
// 		res.status(404).end();
// 	});
// }


// function getOrCreateUserGroup(queryId, authUser) {
//   return UserGroup.findOne({id: queryId}).then(userGroup => {
//     if (!userGroup) {
// 			let newId = formatGroupId(authUser.slackProfile.teamDomain);
// 			let newUserGroup = new UserGroup({
// 				id: newId,
// 				image: '/img/slack/default.png',
// 				categoriesEnabled: false,
//         slackTeamId: authUser.slackProfile.teamId,
//         slackTeamDomain: authUser.slackProfile.teamDomain
//       });
//
// 			return newUserGroup.save().then(group => {
// 				console.log('group created', group);
// 			});
//     }
// 		return userGroup;
//   });
// }
