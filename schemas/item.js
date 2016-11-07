'use strict';
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
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
  category: String,
  comments: [commentSchema],
  createdDate: Date,
  isPrivate: String,
  slackTeamId: String,
  slackChannelId: String,
  tags: [String],
  title: String,
  twitterTweetId: String,
  type: String, // slack, twitter, bookmark
  user: String,
  userGroup: String
});

itemSchema.plugin(mongoosePaginate);

itemSchema.methods.makeEmberItem = function() {
  var comments = this.comments.map(function(comment) {
    return {
      id: comment._id,
      author: comment.author,
      body: comment.body,
      createdDate: comment.createdDate,
      item: comment.item
    };
  });
  var emberItem = {
    id: this._id,
    author: this.author,
    body: this.body,
    category: this.category,
    comments: comments,
    createdDate: this.createdDate,
    isPrivate: this.isPrivate,
    slackChannelId: this.slackChannelId,
    slackTeamId: this.slackTeamId,
    tags: this.tags,
    title: this.title,
    twitterTweetId: this.twitterTweetId,
    type: this.type,
    user: this.user,
    userGroup: this.userGroup
  };
  return emberItem;
};

module.exports = itemSchema;
