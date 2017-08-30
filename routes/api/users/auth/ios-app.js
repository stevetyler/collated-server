'use strict';
const passport = require('../../../../passport/passport-authenticate');

module.exports.autoroute = {
  get: {
    '/ios-app' : [
      passport.authenticate('custom', {
        failureRedirect: 'net.collated.ios://', // redirects back to iOS app, not sure why it's called?
      }),
      authSuccessRedirect
    ]
  }
};

function authSuccessRedirect(req, res) {
  console.log('auth success called');
  let withAccountPath = process.env.NODE_ENV === 'production' ?
		'https://app.collated.net/with-account' : 'http://www.collated-dev.net/with-account';

  res.redirect(withAccountPath);
}
