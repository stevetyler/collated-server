"use strict";
const webshot = require('webshot');
//const debug = require('debug');
const BPromise = require('bluebird');
const unfurl = require('unfurl-url');

function takeScreenshot(text, userId, itemId) {
  //debug('url to take screenshot', extractedUrl);
  const pathToSave = 'images/' + userId + '/' + itemId + '-webshot' + '.png';
  const takeWebshot = BPromise.promisify(webshot);

  return extractUnfurledUrl(text).then(url => {
    console.log('unfurled', url);
    return takeWebshot(url, pathToSave);
  }).then(() => {
    console.log('image saved to' + ' ' + pathToSave); // if takeWebshot not returned, this will log before save
    return;
  }).catch(err => {
    console.log(err);
    return;
  });
}

function extractUnfurledUrl(text) {
  let str = text ? text : '';
  let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  let urls = str.match(urlRegex);
  let extractedUrl = urls ? urls[0] : null;
  const unfurlUrl = BPromise.promisify(unfurl.url);
  console.log('url', extractedUrl);

  return unfurlUrl(extractedUrl);
}

takeScreenshot('https://t.co/KKEirXG9i0', 'steve', '123');
//takeScreenshot('https://www.twitter.com', 'steve', 'facebook');
