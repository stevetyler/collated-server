var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var itemSchema = new Schema({
  id: String,
  user: String,
  tags: [String],
  author: String,
  createdDate: Date,
  body: String,
  twitterTweetAuthor: String,
  twitterTweetId: String,
  twitterLastTweetId: String,
  isPrivate: String
});

module.exports = itemSchema;
