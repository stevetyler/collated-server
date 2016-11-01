'use strict';
const db = require('../../../database/database');
const formatGroupId = require('../../../lib/format-group-id');
const User = db.model('User');
const UserGroup = db.model('UserGroup');

module.exports.autoroute = {
	get: {
		'/userGroups/:id': getUserGroupHandler
	}
};

function getUserGroupHandler(req, res) {
  const queryId = formatGroupId(req.params.id);
	const authUser = req.user;
	const resObj = {};

	getOrCreateUserGroup(queryId, authUser).then(userGroup => {
		const emberUserGroup = userGroup.makeEmberUserGroup();
		Object.assign(resObj, {'userGroup': emberUserGroup});
		return typeof authUser === 'object' ? User.findOne({id: authUser.id}) : null;
	}).then(user => {
		const emberUser = user ? user.makeEmberUser() : [];
		//console.log('resObj', resObj);
		Object.assign(resObj, {'users': emberUser});
	}).then(() => {
		console.log('resObj', resObj);
		res.send(resObj);
	}).catch(err => {
		console.log(err);
		res.status(404).end();
	});
}

function getOrCreateUserGroup(queryId, authUser) {
  return UserGroup.findOne({id: queryId}).then(userGroup => {
    if (!userGroup) {
			let newId = formatGroupId(authUser.slackProfile.teamDomain);
			let newUserGroup = new UserGroup({
				id: newId,
        categoriesEnabled: false,
        slackTeamId: authUser.slackProfile.teamId,
        slackTeamDomain: authUser.slackProfile.teamDomain,
      });
			return newUserGroup.save().then(group => {
				console.log('group created', group);
			});
    }
		console.log('group exists', userGroup);
		return userGroup;
  });
}

// function formatGroupId(name) {
// 	// group ids must be capitalized
//   let isCapitalized = name.charAt(0) === name.charAt(0).toUpperCase();
//
// 	if (!isCapitalized) {
// 		let nameArr = name.split(' ').map(str => {
//       return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
// 		});
//     return nameArr.join('-');
// 	}
// 	return name.split(' ').join('-');
// }
