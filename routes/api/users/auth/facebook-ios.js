'use strict';

module.exports.autoroute = {
  get: {
    '/facebook-ios' : function(req, res) {
      res.cookie('ios', 'true', { expires: new Date(Date.now() + 60000), httpOnly: true });
      res.redirect('/api/users/auth/facebook/callback');
    }
  }
};
