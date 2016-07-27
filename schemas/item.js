var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var itemSchema = new Schema({
  id: String,
  author: String,
  body: String,
  createdDate: Date,
  isPrivate: String,
  slackTeamId: String,
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
    createdDate: this.createdDate,
    isPrivate: this.isPrivate,
    slackTeamId: this.slackTeamId,
    tags: this.tags,
    twitterTweetId: this.twitterTweetId,
    type: this.type,
    user: this.user
  };
  return emberItem;
};

module.exports = itemSchema;
