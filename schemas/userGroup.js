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
  //user: [String]
});

userGroupSchema.methods.makeEmberUserGroup = function() {
  const emberUserGroup = {
    adminPermissions: this.adminPermissions,
    id: this.id,
    image: this.image,
    isPrivate: this.isPrivate,
    slackTeamId: this.slackTeamId,
    slackTeamDomain: this.slackTeamDomain
  };
  return emberUserGroup;
};

module.exports = userGroupSchema;
