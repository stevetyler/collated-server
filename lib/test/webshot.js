"use strict";
const webshot = require('webshot');
const debug = require('debug');
//const MetaInspector = require('node-metainspector-with-headers');
const BPromise = require('bluebird');
const unfurl = require('unfurl-url');
// find items
// map over array of items and
// search for url in body text
// get webshot and save to S3 /assets/userId/<itemId>webshot.jpg
// get title, domain etc.

function takeScreenshot(url, userId, itemId) {
  //let url = extractUrl(text);
  debug('url to take screenshot', url);
  const unfurlUrl = BPromise.promisify(unfurl.url);
  const pathToSave = 'images/' + userId + '/' + itemId + '-webshot' + '.png';
  //const takeWebshot = BPromise.promisify(webshot); // doesn't work why?

  //console.log('takewebshot', takeWebshot);
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

takeScreenshot('https://t.co/KKEirXG9i0', 'steve', '123');
//takeScreenshot('https://www.twitter.com', 'steve', 'facebook');
