'use strict';

const passport = require('../../../../passport/passport-authenticate');
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
	get: {
		'/slack' : passport.authenticate('slack'),
		'/slack/callback' : [
			passport.authenticate('slack', {
				failureRedirect: '/'
			}),
			helpers.authSuccessRedirect
		],
	}
};
