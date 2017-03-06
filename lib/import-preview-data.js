"use strict";
const db = require('../database/database');
const webshot = require('webshot');
const MetaInspector = require('node-metainspector-with-headers');
const BPromise = require('bluebird');
const unfurl = require('unfurl-url');

const Item = db.model('Item');

// find items, map over array of items and search for url in body text
// get webshot and save to S3 /assets/userId/<itemId>webshot.jpg, get title, domain etc.

let itemsArr;
let itemsUrlArr;

Item.find({}).then(items => {
  console.log('1. items found', items.length);
  itemsArr = items;
  itemsUrlArr = items.map(item => {
    return extractUrl(item.body);
  });
  console.log('itemsUrls', itemsUrlArr);

  const screenshotPromises = itemsArr.map(item => {
    return takeScreenshot(item.body, item.user, item._id);
  });

  return Promise.all(screenshotPromises);
}).then(() => {
  console.log('2. get meta');
  const metadataPromises = itemsUrlArr.map(url => {
    return getMetadata(url);
  });
  return Promise.all(metadataPromises);
}).then(arr => {
  console.log('3. metadata returned', arr);

}).catch(err => {
  console.log(err);
});

function extractUrl(text) {
  let str = text ? text : '';
  let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

  let urls = str.match(urlRegex);
  return urls ? urls[0] : null;
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

function takeScreenshot(text, userId, itemId) {
  let url = extractUrl(text);
  console.log('url to take screenshot', url);
  const unfurlUrl = BPromise.promisify(unfurl.url);
  const pathToSave = 'images/' + userId + '/' + itemId + '-webshot' + '.png';
  //const takeWebshot = BPromise.promisify(webshot); // doesn't work why?

  return unfurlUrl(url).then(newUrl => {
    console.log('newUrl', newUrl);
    const takeWebshot = BPromise.promisify(webshot);

    return takeWebshot(newUrl, pathToSave);
  }).then(() => {
    console.log('image saved to' + ' ' + pathToSave); // if takeWebshot not returned, this will log before save
    return;
  }).catch(err => {
    console.log(err);
    return;
  });
}
