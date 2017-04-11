
var passport = require('../../../../passport/passport-authenticate');

if(process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/twitter' : passport.authenticate('twitter'),
	    	'/twitter/callback' : passport.authenticate('twitter', { successRedirect: 'https://app.collated.net/with-account', failureRedirect: '/'}),
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/twitter' : passport.authenticate('twitter'),
	    	'/twitter/callback' : passport.authenticate('twitter', { successRedirect: 'http://www.collated-dev.net/with-account', failureRedirect: '/'}),
		}
	};
}
