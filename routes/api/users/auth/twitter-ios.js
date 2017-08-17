'use strict';

module.exports.autoroute = {
  get: {
    '/twitter-ios' : function(req, res) {
      if (req.query.ios) {
        res.cookie('ios', 'true', { expires: new Date(Date.now() + 900000), httpOnly: true });
      }
      res.redirect('/api/users/auth/twitter/callback');
    }
  }
};
