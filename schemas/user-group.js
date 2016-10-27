var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userGroupSchema = new Schema({
  categoriesEnabled: String
  id: String,
  isPrivate: String,
  permissions: String,
  slackTeamId: String,
  slackTeamDomain: String,
  user: String
});

module.exports = userGroupSchema;
