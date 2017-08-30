'use strict';
const passport = require('../../../../passport/passport-authenticate');
//const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
  get: {
    '/ios-app' : [
      passport.authenticate('custom', {
        failureRedirect: 'net.collated.ios://',
      }),
      authSuccessRedirect
    ]
  }
};


function authSuccessRedirect(req, res) {
  console.log('auth success called');
  let withAccountPath = process.env.NODE_ENV === 'production' ?
		'https://app.collated.net/with-account' : 'http://www.collated-dev.net/with-account';

  res.redirect(withAccountPath); // redirecting to Safari not ViewController
}
