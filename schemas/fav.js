var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var favSchema = new Schema({
  id: String,
  author: String,
  user: String,
  createdDate: Date,
  body: String,
  twitterTweetAuthor: String,
  twitterTweetId: String,
  twitterLastTweetId: String
});

module.exports = favSchema;