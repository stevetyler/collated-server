"use strict";
const webshot = require('webshot');
//const debug = require('debug');
const BPromise = require('bluebird');
const MetaInspector = require('node-metainspector-with-headers');
const unfurl = require('unfurl-url');

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

function getPreviewData(item) {
  let unfurledUrl;
  const extractedUrl = extractUrl(item.body);

  return unfurlUrl(extractedUrl).then(url => {
    unfurledUrl = url;

    return getScreenshot(url, item.user, item.id);
  }).then(() => {
    return getMetadata(unfurledUrl);
  }).then(dataObj => {
    // update item with metadata and path to screenshot
    console.log('meta obj', dataObj);
    return;
  });
}

getPreviewData({
  body: 'hjhj a h s https://t.co/KKEirXG9i0',
  user: 'steve',
  id: '676183'
});

//module.exports;
//getMetadata('https://t.co/KKEirXG9i0');

//takeScreenshot('https://t.co/KKEirXG9i0', 'steve', '123');
//takeScreenshot('https://www.twitter.com', 'steve', 'facebook');
