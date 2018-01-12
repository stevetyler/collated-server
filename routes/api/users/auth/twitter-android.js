'use strict';

module.exports.autoroute = {
  get: {
    '/twitter-android' : function(req, res) {
      res.redirect('https://app.collated.net/twitter-android-redirect');
    }
  }
};
