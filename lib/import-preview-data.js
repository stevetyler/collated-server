const webshot = require('webshot');
const MetaInspector = require('node-metainspector-with-headers');
const mongoose = require('mongoose');
const BPromise = require('bluebird');

const itemSchema = require('../../../schemas/item.js');
const Item = mongoose.model('Item', itemSchema);

// find items, map over array of items and search for url in body text
// get webshot and save to S3 /assets/userId/<itemId>webshot.jpg, get title, domain etc.

let itemsArr;
let itemsUrlArr;

Item.find({}).then(items => {
  itemsArr = items;
  itemsUrlArr = items.map(item => {
    return extractUrl(item.body);
  });

  const screenshotPromises = itemsArr.map(item => {
    return takeScreenshot(item.body, item.user, item._id);
  });

  Promise.all(screenshotPromises);
  return;
}).then(() => {
  const metadataPromises = itemsUrlArr.map(url => {
    return getMetadata(url);
  });
  return Promise.all(metadataPromises);
});

function takeScreenshot(text, userId, itemId) {
  let url = extractUrl(text);
	let pathToSave = 'images/' + userId + '/' + itemId + '-webshot' + '.png';
  let takeWebShot = BPromise.promisify(webshot);

  return takeWebShot(url, pathToSave).then(() => {
    console.log('image saved to' + ' ' + pathToSave);
  }).catch(err => {
    console.log(err);
  });
}

function extractUrl(text) {
  let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

  let urls = text.match(urlRegex);
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
