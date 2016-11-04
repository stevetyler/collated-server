var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tagSchema = new Schema({
  id: String,
  alias: String,
  category: String,
  colour: String,
  itemCount: String,
  isPrivate: String,
  isReserved: String,
  isSlackChannel: String, // moved to category
  name: String,
  slackChannelId: String, // moved to category
  slackTeamId: String, // moved to userGroup
  user: String,
  userGroup: String
});

tagSchema.methods.makeEmberTag = function(count) {
	var emberTag = {
		id: this._id,
    name: this.name,
		colour: this.colour,
    itemCount: count,
    isPrivate: this.isPrivate,
    isSlackChannel: this.isSlackChannel,
    slackChannelId: this.slackChannelId,
    slackTeamId: this.slackTeamId,
    user: this.user,
    userGroup: this.userGroup,
	};
  return emberTag;
};

module.exports = tagSchema;

// tagSchema.statics.createTag = function(tag, done) {
// 	var Tag = this.model('Tag');
//
// 	Tag.create(tag, function(err, tag) {
// 		done(err, tag);
// 	});
// };
