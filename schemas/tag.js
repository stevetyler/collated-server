var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tagSchema = new Schema({
  id: String,
  name: String,
  alias: String,
  newId: String,
  colour: String,
  itemCount: String,
  isPrivate: String,
  isReserved: String,
  isSlackChannel: String,
  slackChannelId: String,
  slackTeamId: String,
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
