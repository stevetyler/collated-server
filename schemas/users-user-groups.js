var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usersUserGroupsSchema = new Schema({
  user_id: String,
  user_group_id: String
});

module.exports = usersUserGroupsSchema;
