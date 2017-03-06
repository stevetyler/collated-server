"use strict";
const BPromise = require('bluebird');
const db = require('../database/database');
//const debug = require('debug');
const MetaInspector = require('node-metainspector-with-headers');
const unfurl = require('unfurl-url');
const webshot = require('webshot');

const Item = db.model('Item');
// find items, map over array of items and search for url in body text
// get webshot and save to S3 /assets/userId/<itemId>webshot.jpg, get title, domain etc.
let itemsArr;
let itemsUrlArr;

Item.find({}).then(items => {
  //console.log('1. items found', items.length);
  itemsArr = items.filter(item => {
    return extractUrl(item.body);
  });

  const itemUrlPromises = itemsArr.map(item => {
    const extractedUrl = extractUrl(item.body);

    return unfurlUrl(extractedUrl);
  });

  return Promise.all(itemUrlPromises);
}).then(urlArr => {
  itemsUrlArr = urlArr;
  console.log('itemsUrl', itemsUrlArr);
  const screenshotPromises = itemsUrlArr.map((url, i) => {
    return getScreenshot(url, itemsArr[i].user, itemsArr[i]._id);
  });

  return Promise.all(screenshotPromises);
}).then(() => {
  console.log('2. get meta');
  const metadataPromises = itemsUrlArr.map(url => {
    return getMetadata(url);
  });
  return Promise.all(metadataPromises);
}).then(metadataArr => {
  console.log('3. metadata returned', metadataArr);
  // update item with metadata
  // save path to preview image!!
  const itemPromises = metadataArr.map((obj, i) => {
    const updatedItem = Object.assign({}, itemsArr[i], metadataArr[i]);

    return updatedItem.save();
  });

  return Promise.all(itemPromises);
}).catch(err => {
  console.log(err);
});

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

function getScreenshot(url, userId, itemId) {
  const pathToSave = 'images/' + userId + '/' + itemId + '-webshot' + '.png';
  const getWebshot = BPromise.promisify(webshot);
  console.log('getScreenshot called on ', url);

  return getWebshot(url, pathToSave).then(() => {
    console.log('image saved to' + ' ' + pathToSave);
    return;
  }).catch(err => {
    console.log(err);
    return;
  });
}

function getMetadata(url) {
  const client = new MetaInspector(url, { timeout: 5000 });
  const fetched = new Promise(function(resolve, reject) {
    client.on('fetch', resolve);
    client.on('error', reject);
  });
  console.log('get meta called');
  client.fetch();

  return fetched.then(() => {
    const dataObj = {
      previewDescription: client.description,
      previewKeywords: client.keywords,
      previewTitle: client.title,
      previewUrl: client.rootUrl
      //return JSON.stringify(util.inspect(dataObj));
    };
    console.log(dataObj);
    return dataObj;
  }, err => {
    console.log(err);
  });
}
