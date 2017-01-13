'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userGroupSchema = new Schema({
  adminPermissions: [String],
  categoryPerSlackChannel: String,
  id: String,
  image: String,
  isPrivate: String,
  slackTeamId: String,
  slackTeamDomain: String,
  slackTeamName: String,
  users: [String]
});

userGroupSchema.methods.makeEmberUserGroup = function() {
  const emberUserGroup = {
    adminPermissions: this.adminPermissions,
    id: this.id,
    image: this.image,
    isPrivate: this.isPrivate,
    slackTeamId: this.slackTeamId,
    slackTeamDomain: this.slackTeamDomain,
    slackTeamName: this.slackTeamName
  };
  return emberUserGroup;
};

userGroupSchema.statics.makeGroupId = function(name) {
  // group ids must be capitalized
  let isCapitalized = name.charAt(0) === name.charAt(0).toUpperCase();

	if (!isCapitalized) {
		let nameArr = name.split(' ').map(str => {
      return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
		});
    console.log('format id', nameArr.join('-'));
    return nameArr.join('-');
	}
	return name.split(' ').join('-');
};


module.exports = userGroupSchema;
