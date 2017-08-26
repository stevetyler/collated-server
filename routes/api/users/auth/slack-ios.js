'use strict';

module.exports.autoroute = {
  get: {
    '/slack-ios' : function(req, res) {
      let cookieOptions = helpers.authCookieOptions;
      res.cookie('ios', 'true', { expires: new Date(Date.now() + 600000), httpOnly: true });
      res.redirect('/api/users/auth/slack/callback');
    }
  }
};
