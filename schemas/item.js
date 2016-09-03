var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var commentSchema = new Schema({
  author: String,
  body: String,
  createdDate: String,
  item: String
});

var itemSchema = new Schema({
  id: String,
  author: String,
  body: String,
  comments: [commentSchema],
  createdDate: Date,
  isPrivate: String,
  slackTeamId: String,
  slackChannelId: String,
  tags: [String],
  twitterTweetId: String,
  type: String, // slack, twitter, bookmark
  user: String
});

itemSchema.methods.makeEmberItem = function() {
  var emberItem = {
    id: this._id,
    author: this.author,
    body: this.body,
    comments: this.comments,
    createdDate: this.createdDate,
    isPrivate: this.isPrivate,
    slackChannelId: this.slackChannelId,
    slackTeamId: this.slackTeamId,
    tags: this.tags,
    twitterTweetId: this.twitterTweetId,
    type: this.type,
    user: this.user
  };
  return emberItem;
};

module.exports = itemSchema;
