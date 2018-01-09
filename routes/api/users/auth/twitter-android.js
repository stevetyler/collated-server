'use strict';
const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
  get: {
    '/twitter-android' : function(req, res) {
      let options = helpers.authCookieOptions;

      res.cookie('android', 'true', options);
      //res.redirect('/api/users/auth/twitter/callback');
      res.redirect('https://app.collated.net/twitter-android');
    }
  }
};
