// crontab -e
// @hourly node /path/to/file/lib/import-items.js > /path/importer.log 
// 

var db = require('../database/database');
var ItemImporter = require("./lib/import-items.js");

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