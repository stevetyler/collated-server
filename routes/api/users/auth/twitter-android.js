'use strict';

module.exports.autoroute = {
  get: {
    '/twitter-android' : function(req, res) {
      res.redirect('/api/users/auth/twitter-android-redirect');
    }
  }
};
