'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  id: String,
  alias: String,
  colour: String,
  itemCount: String,
  isPrivate: String,
  isReserved: String,
  isSlackChannel: String,
  name: String,
  slackChannelId: String,
  //slackTeamId: String,
  user: String,
  userGroup: String
});

categorySchema.methods.makeEmberCategory = function(count) {
	const emberCategory = {
		id: this._id,
    name: this.name,
		colour: this.colour,
		user: this.user,
    itemCount: count,
    isPrivate: this.isPrivate,
    isSlackChannel: this.isSlackChannel,
    slackChannelId: this.slackChannelId,
    //slackTeamId: this.slackTeamId
	};
  return emberCategory;
};

module.exports = categorySchema;

// tagSchema.statics.createTag = function(tag, done) {
// 	var Tag = this.model('Tag');
//
// 	Tag.create(tag, function(err, tag) {
// 		done(err, tag);
// 	});
// };
