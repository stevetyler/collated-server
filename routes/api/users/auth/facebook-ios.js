'use strict';
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
  get: {
    '/facebook-ios' : function(req, res) {
      let options = helpers.authCookieOptions;

      res.cookie('ios', 'true', options);
      res.redirect('/api/users/auth/facebook/callback');
    }
  }
};
