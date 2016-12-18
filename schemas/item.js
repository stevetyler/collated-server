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
      //if (options.categoryPerChannel && category.slackChannelId === options.slackChannelId) { }
      return categories.filter(category => {
        let categoryname = category.name.toLowerCase();
        console.log('slack category id found', category.name);
        //Object.assign(idsObj, {category: category._id});
        return text.indexOf(categoryname) !== -1 || category.isDefault;
      });
    }
  }).then(categoryArr => {
    console.log('categories found', categoryArr);


    //return category ? findItemTags(textToSearch, category.id) : [];
  }).then(tagIdsArr => {
    console.log('tagIdsArr', tagIdsArr);
    return Object.assign(idsObj, {tags: tagIdsArr});
  });
};

function findItemTags(textToSearch, categoryId) {
  return Tag.find({category: categoryId}).then(tags => {
    if (Array.isArray(tags)) {
      return tags.filter(tag => {
        let tagname = tag.name.toLowerCase();

        return textToSearch.indexOf(tagname) !== -1;
      });
    }
  });
}

module.exports = itemSchema;
