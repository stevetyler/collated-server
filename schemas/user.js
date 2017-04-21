'use strict';
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;

const facebookProfileSchema = new Schema({
  facebookId: String
});

const slackProfileSchema = new Schema({
  //isTeamAdmin: String,
  //isTeamOwner: String,
  teamId: String,
  teamDomain: String, // team name
  teamToken: String,
  teamUrl: String,
  userIds: [String],
  userName: String, // displayName
});

const twitterProfileSchema = new Schema({
  autoImport: String,
  latestLikeId: String,
  oldestLikeId: String,
  latestTweetId: String,
  oldestTweetId: String,
  twitterId: String,
  user: String
});

const userSchema = new Schema({
  id: String,
  name: String,
  password: String,
  imageUrl: String,
  email: String,
  permissions: String,
  schemaVersion: String,
  //twitterId: String,
  apiKeys: {
    facebookAccessToken: String,
    facebookSecretToken: String,
    slackAccessToken: String,
    slackRefreshToken: String, // oAuth 2.0
    twitterAccessToken: String,
    twitterSecretToken: String,
  },
  facebookProfile: facebookProfileSchema,
  slackProfile: slackProfileSchema,
  slackUserIds: [String],
  twitterProfile: twitterProfileSchema,
  userGroups: [String]
});

userSchema.methods.makeEmberUser = function () {
  const emberUser = {
    id: this.id,
    name: this.name,
    imageUrl: this.imageUrl,
    email: this.email,
    slackUserIds: this.slackUserIds,
    userGroups: this.userGroups
  };

  if (this.facebookProfile) {
    Object.assign(emberUser, {
      facebookProfile: {
        id: this.facebookProfile._id,
        //facebookId: this.facebookProfile.facebookId
      }
    });
  }
  if (this.slackProfile) {
    Object.assign(emberUser, {
      slackProfile: {
        id: this.slackProfile._id,
        teamDomain: this.slackProfile.teamDomain
      }
    });
  }
  if (this.twitterProfile) {
    Object.assign(emberUser, {
      twitterProfile: {
        id: this.twitterProfile._id,
        autoImport: this.twitterProfile.autoImport,
        latestLikeId: this.twitterProfile.latestLikeId,
        oldestLikeId: this.twitterProfile.oldestLikeId,
        latestTweetId: this.twitterProfile.latestTweetId,
        oldestTweetId: this.twitterProfile.oldestTweetId,
        //twitterId: this.twitterProfile.twitterId
      }
    });
  }
  return emberUser;
};

module.exports = userSchema;

// userSchema.statics.assignAvatar = function (id) {
//   const image, path;
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
//   const User = this.model('User');
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
//     const userIsFollowing = loggedInUser.following.indexOf(this.id) !== -1 ? true : false;
//     // logger.info('The loggedin user is following user \'' + user.id + '\': ', userIsFollowing);
//     return userIsFollowing ? true : false;
//   }
//   return false;
// };
