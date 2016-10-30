'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userGroupSchema = new Schema({
  categoriesEnabled: String,
  id: String,
  image: String,
  isPrivate: String,
  adminPermissions: String,
  slackTeamId: String,
  slackTeamDomain: String,
  //user: String
});

userGroupSchema.methods.makeEmberUserGroup = function() {
  const emberUserGroup = {
    id: this.id,
    image: this.image,
    isPrivate: this.isPrivate,
    adminPermissions: this.adminPermissions,
    slackTeamId: this.slackTeamId,
    slackTeamDomain: this.slackTeamDomain
  };
  return emberUserGroup;
};

module.exports = userGroupSchema;
