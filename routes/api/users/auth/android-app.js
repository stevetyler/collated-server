'use strict';
const passport = require('../../../../passport/passport-authenticate');

module.exports.autoroute = {
  get: {
    '/android-app' : [
      passport.authenticate('custom', {
        failureRedirect: '/',
      }),
      authSuccessRedirect
    ]
  }
};

function authSuccessRedirect(req, res) {
  console.log('authSuccessRedirect called from android-app route');
  let withAccountPath = process.env.NODE_ENV === 'production' ?
	'https://app.collated.net/with-account' : 'http://www.collated-dev.net/with-account';

  res.redirect(withAccountPath);
}
