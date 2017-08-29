'use strict';
//const passport = require('../../../../passport/passport-authenticate');
//const helpers = require('../../../../lib/utilities/helpers');

module.exports.autoroute = {
  get: {
    '/ios-app' : iosRedirect
  }
};

function iosRedirect(req, res) {
  // set query param as cookie and redirect to with-account
  let sid = req.query.token;
  console.log('sid to set', sid);

  res.cookie = res.cookie('connect.sid', sid, {
    expires: new Date(Date.now() + 6 * Math.pow(10, 8)), // expires in a week
    httpOnly: true
  });
  res.redirect('/with-account');
}
