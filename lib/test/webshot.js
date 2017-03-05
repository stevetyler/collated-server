"use strict";
const webshot = require('webshot');
const MetaInspector = require('node-metainspector-with-headers');
const BPromise = require('bluebird');
const util = require('util');
// find items
// map over array of items and
// search for url in body text
// get webshot and save to S3 /assets/userId/<itemId>webshot.jpg
// get title, domain etc.


function getUrlScreenShot(text, userId, itemId) {
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

  return text.match(urlRegex).pop();
}

function getUrlMetaData(url) {
  const client = new MetaInspector(url, { timeout: 5000 });

	client.on('fetch', function(){
		if (client) {
			var dataObj = {
				description: client.description,
        keywords: client.keywords,
        rootUrl: client.rootUrl,
				title: client.title
				//image: client.image,
				//images: client.images
			};
			//var JSONobj = JSON.stringify(util.inspect(dataObj)); // remove circular data
			//console.log('JSON', JSONobj);

      console.log(dataObj);
      //return JSON.stringify(util.inspect(dataObj));
		}
  });
  client.on('error', function(err) {
		console.log(err);
		//return res.status('404').end();
  });
  client.fetch();
}

//getUrlScreenShot('hjsdhfjdshfk hsjdfhjsd fhfhfdhd http://collated.net', 'stevetyler', '12345');

getUrlMetaData('www.collated.net');
