
var passport = require('../../../../passport/passport-authenticate');
module.exports.autoroute = {
	get: {
		'/twitter' : passport.authenticate('twitter'),
    	'/twitter/callback' : passport.authenticate('twitter', { successRedirect: 'http://collated-dev.net/with-account', failureRedirect: '/'}),
	}
}
 