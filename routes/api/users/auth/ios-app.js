'use strict';
const passport = require('../../../../passport/passport-authenticate');
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
  get: {
    '/ios-app' : [
      passport.authenticate('custom', {
        failureRedirect: 'net.collated.ios://',
      }),
      helpers.authSuccessRedirect
    ]
  }
};
