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
  itemsArr = items;
  const itemUrlPromises = itemsArr.map(item => {
    return extractUnfurledUrl(item.body);
  });

  return Promise.all(itemUrlPromises);
}).then(urlArr => {
  itemsUrlArr = urlArr;
  //console.log('itemsUrls', itemsUrlArr);
  const screenshotPromises = itemsUrlArr.map((url, i) => {
    return getScreenshot(url, itemsArr[i].user, itemsArr[i]._id);
  });

  return Promise.all(screenshotPromises);
}).then(() => {
  //console.log('2. get meta');
  const metadataPromises = itemsUrlArr.map(url => {
    return getMetadata(url);
  });
  return Promise.all(metadataPromises);
}).then(() => {
  //console.log('3. metadata returned', arr);
  return;
}).catch(err => {
  console.log(err);
});

function extractUnfurledUrl(text) {
  let str = text ? text : '';
  let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  let urls = str.match(urlRegex);
  let extractedUrl = urls ? urls[0] : null;
  const unfurlUrl = BPromise.promisify(unfurl.url);
  console.log('url', extractedUrl);

  return unfurlUrl(extractedUrl);
}

function getScreenshot(url, userId, itemId) {
  const pathToSave = 'images/' + userId + '/' + itemId + '-webshot' + '.png';
  const getWebshot = BPromise.promisify(webshot);

  return getWebshot(url, pathToSave).then(() => {
    console.log('image saved to' + ' ' + pathToSave); // if takeWebshot not returned, this will log before save
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
    var dataObj = {
      description: client.description,
      keywords: client.keywords,
      rootUrl: client.rootUrl,
      title: client.title
      //return JSON.stringify(util.inspect(dataObj));
    };
    console.log(dataObj);
  }, err => {
    console.log(err);
  });
}
