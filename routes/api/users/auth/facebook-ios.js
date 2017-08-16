
var passport = require('../../../../passport/passport-authenticate');

if(process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/facebook-ios' : passport.authenticate('facebook'),
	    	'/facebook-ios/callback' : passport.authenticate('facebook', { successRedirect: 'https://app.collated.net/with-account-ios', failureRedirect: '/'}),
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/facebook-ios' : passport.authenticate('facebook'),
	    	'/facebook-ios/callback' : passport.authenticate('facebook', { successRedirect: 'http://www.collated-dev.net/with-account-ios', failureRedirect: '/'}),
		}
	};
}
