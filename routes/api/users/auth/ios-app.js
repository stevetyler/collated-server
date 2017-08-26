'use strict';
const passport = require('../../../../passport/passport-authenticate');
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
  get: {
    '/ios-app' : [
      passport.authenticate('custom', {
        failureRedirect: '',
        //res.redirect('net.collated.ios://' + token);
      }),
      helpers.authSuccessRedirect
    ]
  }
};


// function iosRedirect(req, res) {
//   let withAccountPath = process.env.NODE_ENV === 'production' ?
//     'https://app.collated.net/with-account' : 'http://www.collated-dev.net/with-account';
//
//   //console.log('req', req.query);
//   //res.cookie('ios-token', req.query.token, { expires: new Date(Date.now() + 600000), httpOnly: true });
//   res.redirect(withAccountPath);
// }
