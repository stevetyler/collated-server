'use strict';

const passport = require('../../../../passport/passport-authenticate');
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
	get: {
		'/facebook' : passport.authenticate('facebook'),
		'/facebook/callback' : [
			passport.authenticate('facebook', {
				failureRedirect: '/'
			}),
			helpers.authSuccessRedirect
		],
	}
};
