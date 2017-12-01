'use strict';
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
  get: {
    '/facebook-android' : function(req, res) {
      let options = helpers.authCookieOptions;

      res.cookie('android', 'true', options);
      res.redirect('/api/users/auth/facebook/callback');
    }
  }
};
