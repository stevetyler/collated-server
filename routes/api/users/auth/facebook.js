
var passport = require('../../../../passport/passport-authenticate');

if(process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/facebook' : passport.authenticate('facebook'),
	    	'/facebook/callback' : passport.authenticate('facebook', { successRedirect: 'https://app.collated.net/with-account', failureRedirect: '/'}),
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/facebook' : passport.authenticate('facebook'),
	    	'/facebook/callback' : passport.authenticate('facebook', { successRedirect: 'http://www.collated-dev.net/with-account', failureRedirect: '/'}),
		}
	};
}
