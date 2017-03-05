const webshot = require('webshot');
const MetaInspector = require('node-metainspector-with-headers');
const mongoose = require('mongoose');

const itemSchema = require('../../../schemas/item.js');
const Item = mongoose.model('Item', itemSchema);

// find items
// map over array of items and
// search for url in body text
// get webshot and save to S3 /assets/userId/<itemId>webshot.jpg
// get title, domain etc.

Item.find({}).then(items => {
  const itemPromisesArr = items.map(item => {


  });
});

function updateItemPreviewData(item) {
  const url = extractUrl(item.body);





}

function getScreenShot(url, userId, itemId) {
	let pathToSave = '/images/' + userId + '/' + 'itemId' + url + '.png';

	webshot(url, pathToSave, function(err) {
	  // screenshot now saved to google.png

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
			var JSONobj = JSON.stringify(util.inspect(dataObj));
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
