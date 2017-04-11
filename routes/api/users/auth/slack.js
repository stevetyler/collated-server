var passport = require('../../../../passport/passport-authenticate');

if(process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/slack' : passport.authenticate('slack'),
	    	'/slack/callback' : passport.authenticate('slack', { successRedirect: 'https://www.collated.net/with-account', failureRedirect: '/'}),
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/slack' : passport.authenticate('slack'),
	    	'/slack/callback' : passport.authenticate('slack', { successRedirect: 'http://www.collated-dev.net/with-account', failureRedirect: '/'}),
		}
	};
}
