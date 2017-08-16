var passport = require('../../../../passport/passport-authenticate');

if(process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/slack-ios' : passport.authenticate('slack'),
	    	'/slack-ios/callback' : passport.authenticate('slack', { successRedirect: 'net.collated.ios://', failureRedirect: '/'}),
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/slack-ios' : passport.authenticate('slack'),
	    	'/slack-ios/callback' : passport.authenticate('slack', { successRedirect: 'net.collated.ios://', failureRedirect: '/'}),
		}
	};
}
