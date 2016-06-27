var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
  id: String,
  name: String,
  password: String,
  imageUrl: String,
  email: String,
  permissions: String,
  schemaVersion: String,
  apiKeys: {
    facebookAccessToken: String,
    facebookSecretToken: String,
    slackAccessToken: String,
    slackRefreshToken: String, // oAuth 2.0
    twitterAccessToken: String,
    twitterSecretToken: String,
  },
  facebookProfile: {
    id: String
  },
  slackProfile: {
    userId: String,
    userName: String, // displayName
    teamId: String,
    teamDomain: String, // team name
    teamToken: String,
    teamUrl: String
  },
  twitterProfile: {
    id: String,
    autoImport: String,
    newestTweetId: String,
    oldestTweetId: String,
  },
  // old properties to move
  facebookAccessToken: String,
  facebookSecretToken: String,
  twitterAccessToken: String,
  twitterSecretToken: String,
  twitterId: String,
  twitterAutoImport: String,
  twitterNewestTweetId: String,
  twitterOldestTweetId: String,
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

userSchema.methods.updateUserSchema = function(user) {
  if (user.schemaVersion !== 1.1) {
    user.apiKeys.twitterAccessToken = user.twitterAccessToken;
    user.apiKeys.twitterSecretToken = user.twitterSecretToken;
    user.apiKeys.facebookAccessToken = user.facebookAccessToken;
    user.apiKeys.facebookSecretToken = user.facebookSecretToken;
    delete user.twitterAccessToken;
    delete user.twitterSecretToken;
    delete user.facebookAccessToken;
    delete user.facebookSecretToken;

    user.twitterProfile.id = user.twitterId;
    user.twitterProfile.autoImport = user.twitterAutoImport;
    user.twitterProfile.newestTweetId = user.twitterNewestTweetId;
    user.twitterProfile.oldestTweetId = user.twitterOldestTweetId;
    delete user.twitterId;
    delete user.twitterAutoImport;
    delete user.twitterNewestTweetId;
    delete user.twitterOldestTweetId;

    user.schemaVersion = '1.1';
  }
};

module.exports = userSchema;

// userSchema.statics.assignAvatar = function (id) {
//   var image, path;
//
//   switch (id) {
//     case 'css-tricks' : image = 'css-tricks.jpg';
//     break;
//     case 'ember-london' : image = 'ember-london.jpg';
//     break;
//     default : image = 'guest.jpg';
//   }
//   path = '/assets/img/avatars/' + image;
//   return path;
// };

// bcrypt not installing
// userSchema.statics.encryptPassword = function (savedPassword, cb) {
// 	bcrypt.genSalt(10, function(err, salt) {
// 		if (err) {
// 			logger.error('genSalt: ', err);
// 		}
// 		logger.info('bcrypt: ', salt);
// 		bcrypt.hash(savedPassword, salt, function(err, hash) {
// 			if (err) {
// 				logger.error('Hash Problem: ', err);
// 				return res.status(403).end();
// 			}
// 			logger.info('Hashed Password: ', hash);
//     return cb(err, hash);
//     });
//   });
// };
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

// userSchema.methods.isFollowed = function (loggedInUser) {
//   if (loggedInUser) {
//     var userIsFollowing = loggedInUser.following.indexOf(this.id) !== -1 ? true : false;
//     // logger.info('The loggedin user is following user \'' + user.id + '\': ', userIsFollowing);
//     return userIsFollowing ? true : false;
//   }
//   return false;
// };
