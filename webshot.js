"use strict";
const webshot = require('webshot');
const MetaInspector = require('node-metainspector-with-headers');

// find items
// map over array of items and
// search for url in body text
// get webshot and save to S3 /assets/userId/<itemId>webshot.jpg
// get title, domain etc.


function getScreenShot(text, userId, itemId) {
  let url = extractUrl(text);
	let pathToSave = 'images/' + userId + '/' + itemId + '-webshot' + '.png';
  //console.log(url, pathToSave);
	webshot(url, pathToSave, function(err) {
	  // screenshot now saved to google.png
    console.log(err);
	});
}

function extractUrl(text) {
  let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

  return text.match(urlRegex).pop();
}


function getTitle(req, res) {
  const client = new MetaInspector(req.query.data, { timeout: 5000 });

	client.on('fetch', function(){
		if (client) {
			var dataObj = {
				description: client.description,
				hostname: client.hostname,
				title: client.title,
				image: client.image,
				images: client.images
			};
			var JSONobj = JSON.stringify(util.inspect(dataObj)); // remove circular data
			console.log('JSON', JSONobj);
			var title = client.title;

			return res.send(title);
		}
  });
  client.on('error', function(err){
		console.log(err);
		return res.status('404').end();
  });
  client.fetch();
}

getScreenShot('hjsdhfjdshfk hsjdfhjsd fhfhfdhd http://collated.net', 'stevetyler', '12345');
