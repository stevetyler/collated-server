
const db = require('../../../../database/database');
const User = db.model('User');

module.exports.autoroute = {
  get: {
    '/ios-app' : authoriseIOS
  }
};

function authoriseIOS(req, res) {
  //console.log('req', req.query);
  User.findOne({'apiKeys.collatedToken' : req.query.token}).then(user => {
    if (user) {
      let emberUser = user.makeEmberUser();
      let withAccountPath = process.env.NODE_ENV === 'production' ?
        'https://app.collated.net/with-account' : 'http://www.collated-dev.net/with-account';

      //console.log('user found', user);
      res.user = emberUser;
      res.cookie('ios-token', req.query.token, { expires: new Date(Date.now() + 60000), httpOnly: true });
    	res.redirect(withAccountPath);
    }
    else {
      res.status('401').end();
    }
  });
}
