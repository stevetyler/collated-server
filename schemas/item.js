'use strict';

require('any-promise/register/bluebird');

const AWS = require('aws-sdk');
const fs = require('fs');
const MetaInspector = require('node-metainspector-with-headers');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const BPromise = require('any-promise');
const unfurl = require('unfurl-url');
const webshot = require('webshot');

const categorySchema = require('../schemas/category.js');
const Category = mongoose.model('Category', categorySchema);
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
  item: String,
  keywords: String,
  title: String,
  url: String,
});

const itemSchema = new Schema({
  author: String,
  body: String,
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
  twitterTweetId: String,
  type: String, // slack, twitter, bookmark
  user: String,
  userGroup: String
});

itemSchema.plugin(mongoosePaginate);

itemSchema.methods.makeEmberItem = function() {
  console.log('emberItem', this);
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
        item: this.itemPreview.item,
        keywords: this.itemPreview.keywords,
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

itemSchema.statics.getPreviewData = function(item) {
  let unfurledUrl;
  const extractedUrl = extractUrl(item.body);

  return unfurlUrl(extractedUrl).then(url => {
    unfurledUrl = url;

    return getPreviewScreenshot(url, item.user, item.id);
  }).then(() => {
    return getPreviewMeta(unfurledUrl);
  }).then(obj => {
    // update item with metadata and path to screenshot
    console.log('preview meta obj', obj);
    return obj;
  });
};

function getPreviewScreenshot(url, userId, itemId) {
  const pathToSave = 'preview-images/' + userId + '/' + itemId + '-lrg' + '.png';
  const getWebshot = BPromise.promisify(webshot);
  const options = {
    cookies: null
  };
  console.log('getScreenshot called on ', url);

  return getWebshot(url, pathToSave, options).then(() => {
    console.log('image saved to' + ' ' + pathToSave);
    return;
  }).catch(err => {
    console.log(err);
    return;
  });
}

function getPreviewMeta(url) {
  const client = new MetaInspector(url, { timeout: 5000 });
  const fetched = new BPromise(function(resolve, reject) {
    try {
      client.on('fetch', resolve);
    }
    catch (err) {
      client.on('error', reject);
    }
  });
  console.log('get meta called');
  client.fetch();

  return fetched.then(() => {
    console.log(client);

    return {
      description: client.description,
      keywords: client.keywords,
      title: client.title,
      url: client.rootUrl
    };
    //return JSON.stringify(util.inspect(dataObj)); for preview images, need to remove circular data
  }, err => {
    console.log(err);
  });
}

function extractUrl(text) {
  let str = text ? text : '';
  let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  let urls = str.match(urlRegex);

  return urls ? urls[0] : null;
}

function unfurlUrl(url) {
  const unfurlUrl = BPromise.promisify(unfurl.url);
  console.log('unfurlUrl', url);

  return url ? unfurlUrl(url) : null;
}

module.exports = itemSchema;


function uploadImageToS3(filePath, item) {
  AWS.config.setPromisesDependency(BPromise);
  // Create an S3 client
  var s3 = new AWS.S3();
  var bucketName = 'collated-assets/assets/images/previews/';
  var keyName = 'hello_world.txt';
  var text = 'Hello World!';
  var params = {
    Bucket: bucketName,
    Key: keyName,
    Body: item.body
  };
  var putObjectPromise = s3.putObject(params).promise();

  return putObjectPromise.then(function() {
    console.log('Successfully uploaded data to ' + bucketName + '/assets/images/preview/test' + keyName, text);
  }).catch(function(err) {
    console.log(err);
  });
}

// Read in the file, convert it to base64, store to S3
// fs.readFile('del.txt', function (err, data) {
//   if (err) { throw err; }
//
//   var base64data = new Buffer(data, 'binary');
//
//   var s3 = new AWS.S3();
//   s3.client.putObject({
//     Bucket: 'banners-adxs',
//     Key: 'del2.txt',
//     Body: base64data,
//     ACL: 'public-read'
//   },function (resp) {
//     console.log(arguments);
//     console.log('Successfully uploaded package.');
//   });



// const im = require('image-magick');

// 400px lrg, 200px med, 100px sml
// im.resize({
//   srcPath: '/temp/id-.png',
//   dstPath: 'kittens-small.jpg',
//   width: 154, // sml // 308 lrg
//   height: 115 // sml // 230 lrg
// }, function(err, stdout, stderr){
//   if (err) throw err;
//   console.log('resized kittens.jpg to fit within 256x256px');
// });
