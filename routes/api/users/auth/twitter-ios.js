'use strict';
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
  get: {
    '/twitter-ios' : function(req, res) {
      let options = helpers.authCookieOptions;
      console.log('cookie options', options);
      
      res.cookie('ios', 'true', options);
      res.redirect('/api/users/auth/twitter/callback');
    }
  }
};
