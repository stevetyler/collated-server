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
  facebookAccessToken: String,
  facebookSecretToken: String,
  facebookId: String,
  twitterAccessToken: String,
  twitterSecretToken: String,
  twitterId: String,
  twitterFirstTweetId: String,
  twitterLastTweetId: String
});

// methods are called on instances of the User object ie actual objects
// is param needed?
userSchema.methods.makeEmberUser = function (requestedUser) {
  var emberUser = {
    id: this.id,
    name: this.name,
    imageUrl: this.imageUrl,
    email: this.email
  };
  return emberUser;
};

// statics are generic functions
// called on the model ie User
userSchema.statics.createUser = function(user, done) {
  var User = this.model('User');

  // User.encryptPassword async function, then create user in database
  User.encryptPassword(user.password, function (err, encryptedPassword) {
    if (err) {
      // return?
      done(err);
    }
    user.password = encryptedPassword;
    //user.imageUrl = User.assignAvatar(user.id);

    // returns mongodb user
    // Mongoose function === newUser.save() used previously in old
    User.create(user, function(err, user) {
      done(err, user);
    });
  });
};


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

// userSchema.methods.isFollowed = function (loggedInUser) {
//   if (loggedInUser) {
//     var userIsFollowing = loggedInUser.following.indexOf(this.id) !== -1 ? true : false;
//     // logger.info('The loggedin user is following user \'' + user.id + '\': ', userIsFollowing);
//     return userIsFollowing ? true : false;
//   }
//   return false;
// };

module.exports = userSchema;
