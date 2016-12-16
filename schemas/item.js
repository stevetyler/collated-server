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

itemSchema.statics.assignCategory = function(searchText, options) {
  const text = searchText.toLowerCase();
  const query = options.groupId ? {userGroup: options.groupId} : {user: options.userId};
  let categoryId;
  let defaultCategoryId;

  return Category.find(query).then(categories => {
    if (Array.isArray(categories)) {
      categories.forEach(category => {
        let categoryname = category.name.toLowerCase();

        if (text.indexOf(categoryname) !== -1) {
          console.log('category id found', category._id);
          categoryId = category._id;
        }
        if (category.isDefault) {
          console.log('default category id found', category._id);
          defaultCategoryId = category._id;
        }
      });
    }
  }).then(category => {
    if (category) {
      return assignItemTags(searchText, category._id);
    }
  });
};

itemSchema.statics.assignSlackChannelCategory = function(searchText, options) {
  return Category.findOne({slackChannelId: options.slackChannelId}).then(category => {
    if (category) {
      return assignItemTags(searchText, category._id);
    }
  });
};

function assignItemTags(searchText, categoryId) {
  return Tag.find({category: categoryId}).then(tags => {
    if (Array.isArray(tags)) {
      return tags.reduce((arr, tag) => {
        let tagname = tag.name.toLowerCase();

        if (searchText.indexOf(tagname) !== -1) {
          console.log('tag found', tag);
          arr.push(tag._id);
        }
        return arr;
      }, []);
    }
  });
}


module.exports = itemSchema;
