'use strict';

require('any-promise/register/bluebird');
const AWS = require('aws-sdk');
const fs = require('fs-promise');
//const gm = require('gm').subClass({imageMagick: true});
const MetaInspector = require('node-metainspector-with-headers');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const BPromise = require('any-promise');
const rp = require('request-promise');
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
  image: String,
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

AWS.config.setPromisesDependency(BPromise);

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
  const extractedUrl = extractUrl(item.body);
  const itemId = item._id || item.id;
  let url;
  let previewObj;

  return unfurlUrl(extractedUrl).then(unfurledUrl => {
    url = unfurledUrl;

    return getPreviewMeta(url);
  }).then(obj => {
    previewObj = obj;
    const imageUrl = previewObj.image;

    if (imageUrl) {
      console.log('save preview called', imageUrl, itemId);
      return savePreviewImage(imageUrl, itemId);
    }
    else {
      console.log('take webshot called');
      return takeWebshot(url, itemId);
    }
  })
  .then(filepath => {
    console.log('image saved to temp', filepath);
    return uploadImageToS3(filepath);
  })
  .then(() => {
    console.log('image saved to S3');
    return previewObj;
  });
};

function getPreviewMeta(url) {
  const client = new MetaInspector(url, { timeout: 5000 });
  const fetched = new BPromise(function(resolve, reject) {
    client.on('fetch', resolve);
    client.on('error', reject);
  });
  console.log('get meta called');
  client.fetch();

  return fetched.then(() => {
    return {
      description: client.description,
      image: client.image,
      keywords: client.keywords,
      title: client.title,
      url: client.url,
      rootUrl: client.rootUrl,
      ogDescription: client.ogDescription,
      ogTitle: client.ogTitle,
      ogType: client.ogType,
      ogUpdatedTime: client.ogUpdatedTime,
      ogLocale: client.ogLocale
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

function savePreviewImage(imageUrl, itemId) {
  const foldername = 'temp/';
  let fileExt;
  let filename;

  return rp.head(imageUrl).then(res => {
    //console.log(res, res['content-type']);
    fileExt = res['content-type'].split('/').pop();

    return rp(imageUrl, {encoding: null});
  }).then(data => {
    filename = itemId + '.' + fileExt;
    //console.log('writing file to ', foldername + filename);
    return fs.writeFile(foldername + filename, data);
  }).then(() => {
    const filepath = foldername + filename;
    //console.log('file saved', filepath);
    return filepath;
  });
}

function takeWebshot(url, itemId) {
  const foldername = 'temp/';
  const filepath = foldername + itemId + '.png';
  const newWebshot = BPromise.promisify(webshot);
  const options = {
    width: 600,
    height: 450,
    cookies: null
  };
  console.log('getWebshot called on ', url);

  return newWebshot(url, filepath, options).then(() => {
    console.log('image saved to' + ' ' + filepath);
    return filepath;
  }).catch(err => {
    console.log(err);
    return;
  });
}

function uploadImageToS3(filepath) {
  const s3 = new AWS.S3();
  const filename = filepath.split('/').pop();
  let bucketPath;

  if (process.env.NODE_ENV === 'production') {
    bucketPath = 'collated-assets/assets/images/previews/';
  } else {
    bucketPath = 'collated-assets/assets/images/previews/dev';
  }

  return fs.readFile(filepath).then(data => {
    const params = {
      Bucket: bucketPath,
      Key: filename,
      Body: data,
      ACL: 'public-read'
    };

    return s3.putObject(params).promise();
  }).then(function() {
    return fs.unlink(filepath);
  }).catch(function(err) {
    console.log(err);
  });
}

module.exports = itemSchema;



// function resizeImage(item) {
//   // 400px lrg, 200px med, 100px sml
//   BPromise.promisifyAll(imageMagick.prototype);
//   const tmpFolderPath = 'temp/previews/';
//   const srcPath = tmpFolderPath + item.id + '.png';
//   const dstPath = tmpFolderPath + item.id + '-lrg.png';
//
//   return imageMagick(srcPath).resize(154, 115).noProfile().writeAsync(dstPath).then(() => {
//     console.log('resized successfully');
//   })
//   .catch(err => console.log(err));
// }
//
