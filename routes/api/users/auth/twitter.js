'use strict';

const passport = require('../../../../passport/passport-authenticate');
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
	get: {
		'/twitter' : passport.authenticate('twitter'),
		'/twitter/callback' : passport.authenticate('twitter', {
			failureRedirect: '/',
			successRedirect: helpers.authSuccessRedirect
		})
	}
};
