'use strict';

module.exports.autoroute = {
  get: {
    '/android-success-redirect' : function(req, res) {
      try {
        let token = req.user.apiKeys.collatedToken;
        let userId = req.user.id;

        console.log('android success redirect');
        console.log('android true for user ', userId, token);
        res.redirect('net.collated.android://' + token);
      }
      catch(err) {
        console.log(err);
      }
    }
  }
};
