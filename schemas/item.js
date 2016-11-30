'use strict';
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const Schema = mongoose.Schema;

const categorySchema = require('../schemas/category.js');
const Category = mongoose.model('Category', categorySchema);
const tagSchema = require('../schemas/tag.js');
const Tag = mongoose.model('Tag', tagSchema);

const commentSchema = new Schema({
  body: String,
  createdDate: String,
  item: String,
  user: String
});

const itemSchema = new Schema({
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
  const comments = this.comments.map(function(comment) {
    return {
      id: comment._id,
      body: comment.body,
      createdDate: comment.createdDate,
      item: comment.item,
      user: comment.user
    };
  });
  const emberItem = {
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

itemSchema.statics.assignCategoryAndTags = function(titleText, groupId, userId) {
  const text = titleText.toLowerCase();
  const query = groupId ? {userGroup: groupId} : {user: userId};
  let categoryId;

  return Category.find(query).then(categories => {
    if (!groupId && Array.isArray(categories)) {
      return categories.forEach(category => {
        let categoryname = category.name.toLowerCase();

        if (text.indexOf(categoryname) !== -1) {
          categoryId = category._id;
        }
      });
    }
  }).then(() => {
    return Tag.find(query);
  }).then(tags => {
    if (Array.isArray(tags)) {
      return tags.reduce((arr, tag) => {
  			let tagname = tag.name.toLowerCase();

  	    if (text.indexOf(tagname) !== -1) {
  	      console.log('tag found', tag);
  	      arr.push(tag._id);
  	    }
  			return arr;
  	  }, []);
    }
	}).then(arr => {
		console.log('tags returned', arr);
		return {
      categoryId: categoryId,
      tagIds: arr,
		};
	});
};

module.exports = itemSchema;
