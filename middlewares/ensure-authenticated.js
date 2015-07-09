// create middlewares folder with ensureAuthenticated.js module.exports = function etc
module.exports.ensureAuthenticated = function (req, res, done) {
  // Express authentication function using Passport
  if (req.isAuthenticated()) {
    return done();
  }
  else {
    return res.status(403).end();
  }
};

