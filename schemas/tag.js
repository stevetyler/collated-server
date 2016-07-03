var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tagSchema = new Schema({
  id: String,
  alias: String,
  newId: String,
  colour: String,
  user: String,
  itemCount: String,
  isPrivate: String,
  isReserved: String,
  slackChannelId: String,
  slackTeamId: String,
});

tagSchema.methods.makeEmberTag = function(count) {
	var emberTag = {
		id: this.id,
		colour: this.colour,
		user: this.user,
    itemCount: count,
    isPrivate: this.isPrivate
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
