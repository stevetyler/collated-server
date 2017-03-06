'use strict';
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const Schema = mongoose.Schema;

const categorySchema = require('../schemas/category.js');
const Category = mongoose.model('Category', categorySchema);
const tagSchema = require('../schemas/tag.js');
const Tag = mongoose.model('Tag', tagSchema);

const itemMetaSchema = new Schema({
  clickCount: String,
  item: String,
  lastClickedDate: String,
  lastSharedDate: String,
  previewDescription: String,
  previewKeywords: String,
  previewTitle: String,
  previewUrl: String,
  shareCount: String,
  user: String
});

const commentSchema = new Schema({
  body: String,
  createdDate: String,
  item: String,
  user: String
});

const itemSchema = new Schema({
  //id: String,
  author: String,
  body: String,
  category: String,
  comments: [commentSchema],
  createdDate: Date,
  isPrivate: String,
  meta: [itemMetaSchema],
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

itemSchema.statics.assignCategoryAndTags = function(textToSearch, options) {
  const text = textToSearch.toLowerCase();
  const query = options.userGroupId ? {userGroup: options.userGroupId} : {user: options.userId};
  const idsObj = {};

  return Category.find(query).then(categories => {
    console.log('categories found', categories);
    if (Array.isArray(categories)) {
      categories.forEach(category => {
        const categoryname = category.name.toLowerCase();
        //if (options.categoryPerChannel && category.slackChannelId === options.slackChannelId) { }
        if (category.isDefault) {
          console.log('default category found', category.name);
          Object.assign(idsObj, {defaultCategory: category._id});
        }
        if (text.indexOf(categoryname) !== -1) {
          console.log('category matched to text', category.name);
          Object.assign(idsObj, {category: category._id});
        }
      });
    }
    return idsObj;
  }).then(obj => {
    if (!obj.category && obj.defaultCategory) {
      Object.assign(idsObj, {category: obj.defaultCategory});
    }
    const categoryId = obj.category;
    console.log('categoryId to find tags for', categoryId);

    return categoryId ? findItemTags(textToSearch, categoryId) : [];
  }).then(tagIdsArr => {
    console.log('idsObj, tagIdsArr', idsObj, tagIdsArr);
    return Object.assign(idsObj, {tags: tagIdsArr});
  });
};

function findItemTags(textToSearch, categoryId) {
  return Tag.find({category: categoryId}).then(tags => {
    if (Array.isArray(tags)) {
      const tagsMatchedArr = tags.filter(tag => {
        let tmpArr = tag.keywords.concat(tag.name);
        let tmpArrLower = tmpArr.map(name => name.toLowerCase());

        let matchedSearchArr = tmpArrLower.filter(name => {
          return textToSearch.indexOf(name) !== -1;
        });

        return matchedSearchArr.length ? tag : null;
      });

      return tagsMatchedArr.map(tag => tag._id);
    }
  });
}

module.exports = itemSchema;


// let tagsArrMatched = tags.filter(tag => {
//   let searchArr = tag.keywords.concat(tag.name);
//   let matchedSearch = searchArr.filter(name => {
//     return text.indexOf(name) !== -1;
//   });
//   console.log(matchedSearch);
//
// });
