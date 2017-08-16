
var passport = require('../../../../passport/passport-authenticate');

if(process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/twitter-ios' : passport.authenticate('twitter'),
	    	'/twitter-ios/callback' : passport.authenticate('twitter', { successRedirect: 'https://app.collated.net/with-account-ios', failureRedirect: '/'}),
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/twitter-ios' : passport.authenticate('twitter'),
	    	'/twitter-ios/callback' : passport.authenticate('twitter', { successRedirect: 'http://www.collated-dev.net/with-account-ios', failureRedirect: '/'}),
		}
	};
}
