
//const db = require('../../../../database/database');
//const User = db.model('User');

module.exports.autoroute = {
  get: {
    '/ios-app' : iosRedirect
  }
};

function iosRedirect(req, res) {
  let withAccountPath = process.env.NODE_ENV === 'production' ?
    'https://app.collated.net/with-account' : 'http://www.collated-dev.net/with-account';

  //console.log('req', req.query);
  res.cookie('ios-token', req.query.token, { expires: new Date(Date.now() + 60000), httpOnly: true });
  res.redirect(withAccountPath);
}
