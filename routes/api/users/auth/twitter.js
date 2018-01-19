'use strict';

const passport = require('../../../../passport/passport-authenticate');
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
	get: {
		'/twitter' : passport.authenticate('twitter'),
		'/twitter/callback' : [
			function(req, res, next) {
				console.log('HEADERS FROM TWITTER');
				console.log(req.headers);
				next();
			},
			passport.authenticate('twitter', {
				failureRedirect: '/'
			}),
			helpers.authSuccessRedirect
		],
	}
};
