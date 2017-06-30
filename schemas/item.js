'use strict';

require('any-promise/register/bluebird');
const fs = require('fs-promise');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
mongoose.Promise = global.Promise;

const categorySchema = require('../schemas/category.js');
const Category = mongoose.model('Category', categorySchema);
const extractUrl = require('../lib/utilities/extractUrl.js');


const Schema = mongoose.Schema;
const tagSchema = require('../schemas/tag.js');
const Tag = mongoose.model('Tag', tagSchema);

const commentSchema = new Schema({
  body: String,
  createdDate: String,
  item: String,
  user: String
});

const itemMetaSchema = new Schema({
  clickCount: String,
  item: String,
  lastClickedDate: String,
  lastSharedDate: String,
  shareCount: String,
});

const itemPreviewSchema = new Schema({
  description: String,
  image: String,
  imageType: String,
  item: String,
  keywords: String,
  title: String,
  url: String,
  ogDescription: String,
  ogTitle: String,
  ogType: String,
  ogLocale: String
});

const itemSchema = new Schema({
  author: String,
  body: String,
  bodyArr: [String],
  category: String,
  comments: [commentSchema],
  createdDate: Date,
  isPrivate: String,
  itemMeta: itemMetaSchema,
  itemPreview: itemPreviewSchema,
  slackTeamId: String,
  slackChannelId: String,
  tags: [String],
  title: String,
  titleArr: [String],
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
    bodyArr: this.bodyArr,
    category: this.category,
    comments: comments,
    createdDate: this.createdDate,
    isPrivate: this.isPrivate,
    slackChannelId: this.slackChannelId,
    slackTeamId: this.slackTeamId,
    tags: this.tags,
    title: this.title,
    titleArr: this.titleArr,
    twitterTweetId: this.twitterTweetId,
    type: this.type,
    user: this.user,
    userGroup: this.userGroup
  };

  if (typeof this.itemMeta === 'object') {
    Object.assign(emberItem, {
      itemMeta: {
        id: this.itemMeta._id,
        clickCount: this.itemMeta.clickCount,
        item: this.itemMeta.item,
        lastClickedDate: this.itemMeta.lastClickedDate,
        lastSharedDate: this.itemMeta.lastSharedDate,
        shareCount: this.itemMeta.shareCount
      }
    });
  }
  if (typeof this.itemPreview === 'object') {
    Object.assign(emberItem, {
      itemPreview: {
        id: this.itemPreview._id,
        description: this.itemPreview.description,
        image: this.itemPreview.image,
        imageType: this.itemPreview.imageType,
        item: this.itemPreview.item,
        keywords: this.itemPreview.keywords,
        rootUrl: this.itemPreview.rootUrl,
        title: this.itemPreview.title,
        url: this.itemPreview.url
      }
    });
  }

  return emberItem;
};

itemSchema.statics.getCategoryAndTags = function(textToSearch, options) {
  const text = textToSearch.toLowerCase();
  const query = options.userGroup ? {userGroup: options.userGroup} : {user: options.user};
  const idsObj = {};

  return Category.find(query).then(categories => {
    //console.log('categories found', categories);
    if (Array.isArray(categories)) {
      categories.forEach(category => {
        const categoryname = category.name.toLowerCase();
        //if (options.categoryPerChannel && category.slackChannelId === options.slackChannelId) { }
        if (category.isDefault) {
          //console.log('default category found', category.name);
          Object.assign(idsObj, {defaultCategory: category._id});
        }
        if (text.indexOf(categoryname) !== -1) {
          //console.log('category matched to text', category.name);
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
    //console.log('categoryId to find tags for', categoryId);

    return categoryId ? findItemTags(textToSearch, categoryId) : [];
  }).then(tagIdsArr => {
    //console.log('idsObj, tagIdsArr', idsObj, tagIdsArr);
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

itemSchema.statics.getPreviewData = function(item) {
  let url, previewObj, fileExt, imageUrl;
  const extractedUrl = extractUrl(item.body);
  const itemId = item._id || item.id;
  const folder = '../collated-temp/';
  const filenameArr = [];

  console.log('extractedUrl', extractedUrl);
  if (!extractedUrl) { throw new Error('no url found'); }

  return unfurlUrl(extractedUrl).then(unfurledUrl => {
    //console.log('unfurledUrl', unfurledUrl);
    if (!unfurledUrl) { throw new Error('error unfurling url'); }
    else { url = unfurledUrl; }

    return getPreviewMeta(url);
  }).then(obj => {
    //console.log('previewobj', obj);
    previewObj = obj;
    imageUrl = formatImageUrl(previewObj.image);

    return imageUrl ? saveMetaImage(imageUrl, itemId) : null;
  }).then(metaImage => {
    if (metaImage) {
      fileExt = metaImage.split('.').pop();
      filenameArr.push(metaImage);
      return;
    }
    else {
      console.log('meta file returned', metaImage, 'taking webshot');
      return takeWebshot(url, itemId);
    }
  }).then(screenshot => {
    if (screenshot && typeof screenshot === 'string') {
      fileExt = screenshot.split('.').pop();
      filenameArr.push(screenshot);
    }
    const tmpfile = screenshot || filenameArr[0];
    //console.log('tmpFile', tmpfile, typeof tmpfile);
    if (tmpfile && typeof tmpfile === 'string') {
      return Promise.all([
        resizeImage(folder, tmpfile, 105, '-sml'),
        resizeImage(folder, tmpfile, 210, '-med'),
        resizeImage(folder, tmpfile, 420, '-lrg')
      ]);
    }
    else { throw new Error('error creating image'); }
  })
  .then(arr => {
    if (!arr || !arr.length) { throw new Error('empty file array'); }

    const filesArr = arr;
    const filenamePromises = filesArr.map(filename => {
      console.log('image saved ' + folder + filename);
      return uploadImageToS3(folder, filename);
    });

    return Promise.all(filenamePromises);
  })
  .then(arr => {
    if (!arr || !arr.length) { throw new Error('empty file array'); }
    else {
      arr.map(filename => {
        filenameArr.push(filename);
      });
    }
    const promisesArr = filenameArr.map(filename => {
      const filepath = folder + filename;
      //console.log('deleting file', filepath);
      return fs.unlink(filepath);
    });

    return Promise.all(promisesArr);
  }).then(() => {
    return previewObj ? Object.assign(previewObj, {imageType: fileExt}) : null;
  }).catch(err => {
    console.log('caught error', err.message);
    if (err.message !== 'meta error') { return { url: 'preview error' }; }
  });
};


module.exports = itemSchema;
