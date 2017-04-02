'use strict';

require('any-promise/register/bluebird');
const AWS = require('aws-sdk');
const fs = require('fs-promise');
const gm = require('gm').subClass({imageMagick: true});
const MetaInspector = require('node-metainspector-with-headers');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const BPromise = require('any-promise');
BPromise.promisifyAll(gm.prototype);
const rp = require('request-promise');
const unfurl = require('unfurl-url');
//const Url = require('url');
const webshot = require('webshot');

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

  return unfurlUrl(extractedUrl).then(unfurledUrl => {
    url = unfurledUrl;

    return getPreviewMeta(url);
  }, () => {
    throw Error('error unfurling url');
  }).then(obj => {
    previewObj = obj;
    //console.log('preview meta obj received', previewObj);
    imageUrl = formatImageUrl(previewObj.image);
    console.log('imageUrl', previewObj.image);
    if (imageUrl) {
      let options = {
        method: 'GET',
        uri: imageUrl,
        simple: false, // don't reject errors
        resolveWithFullResponse: true
      };

      return rp(options);
    } else {
      return {};
    }
  }).then(res => {
    console.log('check url', JSON.stringify(res));
    let statusCode;
    try {
      statusCode = res.statusCode;
    } catch (err) {
      console.log(err);
    }

    return imageUrl && statusCode !== 404 || 403 ?
      savePreviewImage(imageUrl, itemId) : takeWebshot(url, itemId);
  })
  .then(filename => {
    if (filename) {
      fileExt = filename.split('.').pop();
      filenameArr.push(filename);

      return Promise.all([
        resizeImage(folder, filename, 105, '-sml'),
        resizeImage(folder, filename, 210, '-med'),
        resizeImage(folder, filename, 420, '-lrg')
      ]);
    }
    else { throw Error('error creating image'); }
  })
  .then(arr => {
    const filesArr = arr;
    const filenamePromises = filesArr.map(filename => {
      //console.log('image saved ' + folder + filename);
      return uploadImageToS3(folder, filename);
    });

    return Promise.all(filenamePromises);
  })
  .then(arr => {
    const tempfilesArr = filenameArr.concat(arr);
    const promisesArr = tempfilesArr.map(filename => {
      const filepath = folder + filename;

      return fs.unlink(filepath);
    });

    return Promise.all(promisesArr);
  })
  .then(() => {
    //console.log('preview object to return', previewObj);
    return previewObj ? Object.assign(previewObj, {imageType: fileExt}) : null;
  }).catch(err => {
    console.log('caught error', err);
    if (err.statusCode === 404) {
      return {
        url: 'url not found'
      };
    }
    else {
      return null;
    }
  });
};

function getPreviewMeta(url) {
  const client = new MetaInspector(url, { timeout: 5000 });
  const fetched = new BPromise(function(resolve, reject) {
    client.on('fetch', resolve);
    client.on('error', reject);
  });

  client.fetch();

  return fetched.then(() => {
    return {
      description: client.description || client.title,
      image: client.image,
      keywords: client.keywords,
      title: client.title,
      url: client.url || url,
      rootUrl: client.rootUrl,
      ogDescription: client.ogDescription,
      ogTitle: client.ogTitle,
      ogType: client.ogType,
      ogUpdatedTime: client.ogUpdatedTime,
      ogLocale: client.ogLocale
    };
  }, err => {
    throw Error('preview meta error', err);
  });
}

function formatImageUrl(url) {
  if (!url) {
    return null;
  }
  else if (url.indexOf('cdn') === 0 ) {
    return 'http://' + url;
  }
  else if (url.indexOf('//cdn') === 0) {
    return 'http:' + url;
  }
  else {
    return url;
  }
}

function unfurlUrl(url) {
  const unfurlUrl = BPromise.promisify(unfurl.url);
  //console.log('unfurlUrl', url);

  return url ? unfurlUrl(url) : null;
}

function savePreviewImage(imageUrl, itemId) {
  console.log('save preview image called');
  const foldername = '../collated-temp/';
  let fileExt;
  let filename;

  return rp.head(imageUrl).then(res => {
    //console.log(res, res['content-type']);
    fileExt = res['content-type'].split('/').pop();

    return rp(imageUrl, {encoding: null});
  }).then(data => {
    filename = itemId + '.' + fileExt;
    console.log('writing file to ', foldername + filename);
    return fs.writeFile(foldername + filename, data);
  }).then(() => {
    return filename;
  });
}

function takeWebshot(url, itemId) {
  const tempFolder = '../collated-temp/';
  const filename = itemId + '.png';
  const filepath = tempFolder + filename;
  const newWebshot = BPromise.promisify(webshot);
  const options = {
    width: 600,
    height: 450,
    cookies: null,
    //timeout: 3000,
    renderDelay: 2000, // remove if creating link manually
  };
  console.log('getWebshot called on ', url);

  return newWebshot(url, filepath, options).then(() => {
    //console.log('image saved to' + ' ' + filepath);
    return filename;
  }).catch(err => {
    console.log(err);
    return;
  });
}

function resizeImage(folder, filename, width, suffix) {
  const ext = filename.split('.').pop();
  const newFilename = filename.split('.')[0] + suffix + '.' + ext;
  const srcPath = folder + filename;
  const dstPath = folder + newFilename;

  return gm(srcPath).resize(width).noProfile().writeAsync(dstPath).then(() => {
    //console.log('resized successfully');
    return newFilename;
  })
  .catch(err => console.log(err));
}

function uploadImageToS3(folder, filename) {
  const s3 = new AWS.S3();
  let uploadFolder;

  if (process.env.NODE_ENV === 'production') {
    uploadFolder = 'assets/images/previews/';
  } else {
    uploadFolder = 'assets/images/previews/dev/';
  }

  return fs.readFile(folder + filename).then(data => {
    const params = {
      Bucket: 'collated-assets',
      Key: uploadFolder + filename,
      Body: data,
      ACL: 'public-read'
    };

    return s3.putObject(params).promise();
  }).then(() => {
    return filename;
  }).catch(function(err) {
    console.log(err);
  });
}

module.exports = itemSchema;
