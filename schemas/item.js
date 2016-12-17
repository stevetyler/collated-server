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

itemSchema.statics.findCategoryAndTags = function(textToSearch, options) {
  const text = textToSearch.toLowerCase();
  const query = options.userGroupId ? {userGroup: options.userGroupId} : {user: options.userId};
  const idsObj = {};

  return Category.find(query).then(categories => {
    if (Array.isArray(categories)) {
      categories.forEach((category, i) => {
        let categoryname = category.name.toLowerCase();

        if (options.categoryPerChannel && category.slackChannelId === options.slackChannelId) {
          console.log('slack category id found', category.name);
          Object.assign(idsObj, {category: category._id});
        }
        else if (text.indexOf(categoryname) !== -1) {
          console.log('category id found', category._id);
          Object.assign(idsObj, {category: category._id});
        }
        else if (category.isDefault) {
          console.log('default category id found', category._id);
          Object.assign(idsObj, {category: category._id});
        }
        else if (i === 0) {
          console.log('default category id', category._id);
          Object.assign(idsObj, {category: category._id});
        }
      });
    }
  }).then(category => {
    return category ? findItemTags(textToSearch, category._id) : [];
  }).then(tagIdsArr => {
    return tagIdsArr.length ? Object.assign(idsObj, {tags: tagIdsArr}) : {};
  });
};

itemSchema.statics.findSlackCategoryAndTags = function(textToSearch, options) {
  return Category.findOne({slackChannelId: options.slackChannelId}).then(category => {
    if (category) {
      return findItemTags(textToSearch, category._id);
    }
  });
};

function findItemTags(textToSearch, categoryId) {
  return Tag.find({category: categoryId}).then(tags => {
    if (Array.isArray(tags)) {
      return tags.reduce((arr, tag) => {
        let tagname = tag.name.toLowerCase();

        if (textToSearch.indexOf(tagname) !== -1) {
          console.log('tag found', tag);
          arr.push(tag._id);
        }
        return arr;
      }, []);
    }
  });
}

module.exports = itemSchema;
