var bcrypt = require('bcrypt');
var logger = require('nlogger').logger(module);
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var userSchema = new Schema({
  id: String,
  name: String,
  password: String,
  imageUrl: String,
  email: String,
  permissions: String,
  facebookId: String,
  facebookAccessToken: String,
  facebookSecretToken: String,
  twitterAccessToken: String,
  twitterSecretToken: String,
  twitterId: String,
  twitterAutoImport: String,
  twitterNewestTweetId: String,
  twitterOldestTweetId: String,
  apiKeys: {
    slackAccessToken: String,
    slackSecretToken: String
  },
  facebookProfile: {},
  slackProfile: {
    id: String
  },
  twitterProfile: {}
});

userSchema.methods.makeEmberUser = function () {
  var emberUser = {
    id: this.id,
    name: this.name,
    imageUrl: this.imageUrl,
    email: this.email,
    twitterAutoImport: this.twitterAutoImport,
    twitterNewestTweetId: this.twitterNewestTweetId,
    twitterOldestTweetId: this.twitterOldestTweetId
  };
  return emberUser;
};

// userSchema.statics.createUser = function(user, done) {
//   var User = this.model('User');
//
//   // User.encryptPassword async function, then create user in database
//   User.encryptPassword(user.password, function (err, encryptedPassword) {
//     if (err) {
//       // return?
//       done(err);
//     }
//     user.password = encryptedPassword;
//     //user.imageUrl = User.assignAvatar(user.id);
//
//     // returns mongodb user
//     // Mongoose function === newUser.save() used previously in old
//     User.create(user, function(err, user) {
//       done(err, user);
//     });
//   });
// };


// bcrypt not installing
userSchema.statics.encryptPassword = function (savedPassword, cb) {
	bcrypt.genSalt(10, function(err, salt) {
		if (err) {
			logger.error('genSalt: ', err);
		}
		logger.info('bcrypt: ', salt);
		bcrypt.hash(savedPassword, salt, function(err, hash) {
			if (err) {
				logger.error('Hash Problem: ', err);
				return res.status(403).end();
			}
			logger.info('Hashed Password: ', hash);
    return cb(err, hash);
    });
  });
};

userSchema.statics.assignAvatar = function (id) {
  var image, path;

  switch (id) {
    case 'css-tricks' : image = 'css-tricks.jpg';
    break;
    case 'ember-london' : image = 'ember-london.jpg';
    break;
    default : image = 'guest.jpg';
  }
  path = '/assets/img/avatars/' + image;
  return path;
};

module.exports = userSchema;
