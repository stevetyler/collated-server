// crontab -e
// @hourly node /home/ubuntu/collated-server/lib/cron-importer.js > /home/ubuntu/collated-server/lib/importer.log 
// 

var db = require('../database/database');
var async = require('async');
var ItemImporter = require('../lib/import-items.js');
var User = db.model('User');

console.log('Starting import item procedure');

db.once("open", function() {

	// find users with access tokens only
	User.where("twitterAccessToken").ne(null).find(function (err, users) {

		async.each(users, ItemImporter.importItems, function(err) {
			if(err) {
				console.log(err);
			}
			else {
				console.log('success');
			}
			process.exit();
		});
	});
});