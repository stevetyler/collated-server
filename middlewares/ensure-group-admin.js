var db = require('../../../database/database');
var User = db.model('User');
//var UserGroup = db.model('UserGroup');

module.exports.ensureGroupAdmin = function (req, res, done) {
  // Express authentication function using Passport
  const user = req.user;

  User.findOne({id: user.id}).then(() => {

  });

  if (req.isAuthenticated()) {
    return done();
  }
  else {
    return res.status(403).end();
  }
};
