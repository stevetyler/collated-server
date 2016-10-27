'use strict';
const db = require('../../../database/database');
const User = db.model('User');
const UserGroup = db.model('UserGroup');

module.exports.autoroute = {
	get: {
		'/user-groups/:id': getUserGroupHandler
	}
};

function getUserGroupHandler(req, res) {
  const queryId = req.query.id;
	const authUser = req.user;
	const resObj = {};

	getOrCreateUserGroup(queryId, authUser).then(userGroup => {
		const emberUserGroup = userGroup.makeEmberUserGroup();

		Object.assign(resObj, {'userGroup': emberUserGroup});
		return User.findOne({id: authUser});
	}).then(user => {
		const emberUser = user ? user.makeEmberUser() : [];

		Object.assign(resObj, {'user': emberUser});
	}).then(() => {
		console.log('resObj', resObj);
		res.send(resObj);
	}).catch(err => {
		console.log(err);
		res.status(401).end();
	});
}

function getOrCreateUserGroup(queryId, authUser) {
  return UserGroup.findOne({id: queryId}).then(userGroup => {
    if (!userGroup) {
      let newUserGroup = {
				id: authUser.slackProfile.teamDomain,
        categoriesEnabled: false,
        slackTeamId: authUser.slackProfile.teamId,
        slackTeamDomain: authUser.slackProfile.teamDomain,
      };
			return UserGroup.create(newUserGroup);
    }
		return userGroup;
  });
}
