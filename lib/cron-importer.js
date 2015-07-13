// crontab -e
// @hourly node /path/to/file/lib/import-favs.js > /path/importer.log 
// 

var db = require('../database/database');
var FavImporter = require("./lib/import-favs.js");

console.log('Starting import fav procedure');

db.once("open", function() {

	// find users with access tokens only
	User.where("twitterAccessToken").ne(null).find(function (err, users) {

		async.each(users, FavImporter.importFavs, function(err) {
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