var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var itemSchema = new Schema({
  id: String,
  user: String,
  tags: [String],
  author: String,
  createdDate: Date,
  body: String,
  type: String, // Slack, Tweet, Bookmark
  twitterTweetId: String,
  slackTeamId: String,
  isPrivate: String
});

itemSchema.methods.makeEmberItem = function() {
  var emberItem = {
    id: this._id,
    user: this.user.id,
    body: this.body,
    createdDate: this.createdDate,
    author: this.author,
    tags: this.tags,
    type: this.type,
    isPrivate: this.isPrivate,
    twitterTweetId: this.twitterTweetId
  };
  return emberItem;
};

module.exports = itemSchema;
