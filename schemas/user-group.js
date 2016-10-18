var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userGroupSchema = new Schema({
  id: String,
  isPrivate: String,
  permissions: String,
  slackTeamId: String,
  slackChannelsEnabled: String,
  user: String
});

module.exports = userGroupSchema;
