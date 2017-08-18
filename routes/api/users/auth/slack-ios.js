'use strict';

module.exports.autoroute = {
  get: {
    '/slack-ios' : function(req, res) {
      res.cookie('ios', 'true', { expires: new Date(Date.now() + 60000), httpOnly: true });
      res.redirect('/api/users/auth/slack/callback');
    }
  }
};
