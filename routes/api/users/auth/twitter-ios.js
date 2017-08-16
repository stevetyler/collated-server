
var passport = require('../../../../passport/passport-authenticate');

if(process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/twitter-ios' : passport.authenticate('twitter'),
	    	'/twitter-ios/callback' : passport.authenticate('twitter', { successRedirect: 'net.collated.ios://', failureRedirect: '/'}),
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/twitter-ios' : passport.authenticate('twitter'),
	    	'/twitter-ios/callback' : passport.authenticate('twitter', { successRedirect: 'net.collated.ios://', failureRedirect: '/'}),
		}
	};
}
