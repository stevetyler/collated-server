'use strict';
//var bcrypt = require('bcrypt');
//var LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');
const randtoken = require('rand-token');

const IosStrategy = require('passport-custom').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const SlackStrategy = require('./passport-slack-updated');
//const SlackStrategy = require('passport-slack').Strategy;

const configAuth = require('./../auth');
const db = require('./../database/database');

const User = db.model('User');
const UserGroup = db.model('UserGroup');

passport.use(new IosStrategy(function(req, done) {
  User.findOne({'apiKeys.collatedToken': req.query.token})
    .then(user => {
      console.log('ios user found', user.id);
      return done(null, user);
    })
    .then(null, err => {
      console.log(err);
      done(err, null);
    });
  })
);

passport.use(new TwitterStrategy({
    consumerKey: configAuth.twitterAuth.consumerKey,
    consumerSecret: configAuth.twitterAuth.consumerSecret,
    callbackURL: configAuth.twitterAuth.callbackURL,
    passReqToCallback: true
  },
  function(req, token, tokenSecret, profile, done) {
    console.log('req received from Twitter', req.query);
    User.findOne({ 'twitterProfile.twitterId': profile._json.id_str } ).then(function(user) {
      //console.log('user found', user);
      if (user) {
        user.apiKeys.twitterAccessToken = token;
        user.apiKeys.twitterSecretToken = tokenSecret;
        user.imageUrl = modifyTwitterImageURL(profile._json.profile_image_url);

        if (!user.apiKeys.collatedToken) {
          user.apiKeys.collatedToken = randtoken.generate(16);
        }
        return user.save();
      } else {
        return User.create({
          imageUrl: modifyTwitterImageURL(profile._json.profile_image_url),
          name: profile._json.name,
          apiKeys: {
            collatedToken: randtoken.generate(16),
            twitterAccessToken: token,
            twitterSecretToken: tokenSecret,
          },
          twitterProfile: {
            twitterId: profile._json.id_str
          }
        });
      }
    })
    .then(function(user){
      return done(null, user);
    })
    .then(null, function(err){
      console.log(err);
      done(err);
    });
  })
);

passport.use(new FacebookStrategy({
    clientID : configAuth.facebookAuth.clientID,
    clientSecret : configAuth.facebookAuth.clientSecret,
    callbackURL : configAuth.facebookAuth.callbackURL,
    profileFields : ['id', 'displayName', 'photos', 'profileUrl']
  },
  function(accessToken, secretToken, profile, done) {
    User.findOne({ 'facebookProfile.facebookId' : profile.id}).exec().then(function(user) {
      if (user) {
        user.apiKeys.facebookAccessToken = accessToken;
        user.apiKeys.facebookSecretToken = secretToken;
        user.imageUrl = profile.photos[0].value;

        if (!user.apiKeys.collatedToken) {
          user.apiKeys.collatedToken = randtoken.generate(16);
        }
        return user.save();
      } else {
        return User.create({
          name: profile.displayName,
          imageUrl: profile.photos[0].value,
          apiKeys: {
            collatedToken: randtoken.generate(16),
            facebookAccessToken: accessToken,
            facebookSecretToken: secretToken
          },
          facebookProfile: {
            facebookId: profile.id
          }
        });
      }
    })
    .then(function(user){
      //console.log('fb user', user);
      return done(null, user);
    })
    .then(null, function(err){
      console.log(err);
      done(err);
    });
  }
));

passport.use(new SlackStrategy({
    clientID: configAuth.slackAuth.clientID,
    clientSecret: configAuth.slackAuth.clientSecret,
    callbackURL: configAuth.slackAuth.callbackURL,
    scope: 'identity.basic,identity.team,identity.email,identity.avatar'
  },

  function(accessToken, refreshToken, profile, done) {
    //console.log('slack profile received', JSON.stringify(profile._json));
    const profileObj = {
      teamDomain: profile._json.info.team.domain,
      teamId: profile._json.info.team.id,
      teamImageUrl: profile._json.info.team.image_34,
      teamName: profile._json.info.team.name,
      userEmail: profile._json.info.user.email,
      userId: profile._json.info.user.id,
      userImageUrl: profile._json.info.user.image_24,
      userName: profile._json.info.user.name,
      // userIdName: profile._json.user - not provided by Slack with identity scope
    };

    UserGroup.findOne({slackTeamId: profileObj.teamId}).then(group => {
      if (!group) {
  			const newId = UserGroup.makeGroupId(profileObj.teamName);
        //console.log('new group id created', newId);
        const newUserGroup = new UserGroup({
  				id: newId,
  				image: profileObj.teamImageUrl,
          slackTeamId: profileObj.teamId,
          slackTeamDomain: profileObj.teamDomain,
          slackTeamName: profileObj.teamName
        });

  			return newUserGroup.save();
      }
      return group;
    }).then(group => {
      Object.assign(profileObj, {userGroup: group});
      //return User.findOne({ name: profileObj.userName, email: profileObj.userEmail });
      return User.findOne({ name: profileObj.userName, slackUserIds: { $in: [profileObj.userId] } });
    }).then(user => {
      if (!user) {
        console.log('new slack user created');
        return User.findOne({ name: profileObj.userName, email: profileObj.userEmail });
      } else {
        return user;
      }
    }).then(user => {
      if (user !== null && typeof user === 'object') {
        console.log('user found', user);
        const updatedUser = Object.assign(user, {
          apiKeys: {
            slackAccessToken: accessToken,
            slackRefreshToken: refreshToken
          },
          //email: profileObj.userEmail,
          imageUrl: profileObj.userImageUrl,
          name: profileObj.userName,
        });

        if (user.slackUserIds.length) {
          if (user.slackUserIds.indexOf(profileObj.userId) === -1) {
            Object.assign(updatedUser, {
              slackUserIds: user.slackUserIds.concat(profileObj.userId),
              userGroups: user.userGroups.concat(profileObj.userGroup.id)
            });
          }
          return updatedUser.save();
        } else {
          Object.assign(updatedUser, {
            slackUserIds: [profileObj.userId],
            userGroups: [profileObj.userGroup.id]
          });
          //console.log('user updated with new slack ids', updatedUser);
          return updatedUser.save();
        }
      }
      else {
        return User.create({
          apiKeys: {
            slackAccessToken: accessToken,
            slackRefreshToken: refreshToken
          },
          email: profileObj.userEmail,
          imageUrl: profileObj.userImageUrl,
          name: profileObj.userName,
          slackUserIds: [profileObj.userId],
          userGroups: [profileObj.userGroup.id]
        });
      }
    }).then(user => {
      const group = profileObj.userGroup;

      Object.assign(profileObj, {user: user});
      try {
        if (user.id && group.users.indexOf(user.id) === -1) {
          // have to return or group isn't updated ?
          return group.update({
            users: group.users.concat(user.id)
          });
        }
      } catch (err) {
        console.log(err);
      }
    }).then(() => {
      console.log('user created or updated', profileObj.user);
      return done(null, profileObj.user);
    }).catch(err => {
      console.log('slack error', JSON.stringify(err));
      done(err);
    });
  }
));

passport.serializeUser((user, done) => {
  console.log('serializeUser', user._id);
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  console.log('deserializeUser', id);
  User.findOne({_id: id}, (err, user) => {
    const emberUser = user.makeEmberUser();
    if (err) {
      return done(err);
    }
    return done(null, emberUser);
  });
});

function convertToHttps(url) {
  return url.replace(/^http:\/\//i, 'https://');
}

function modifyTwitterImageURL(url) {
  var newURL;

  if (url.indexOf('default_profile') !== -1) {
    return convertToHttps(url);
  }
  else if (url.lastIndexOf('normal.jpg') !== -1) {
    // use regex instead
    newURL = url.substring(0, url.lastIndexOf('normal.jpg')) + 'bigger.jpg';
    return convertToHttps(newURL);
  }
  else if (url.lastIndexOf('normal.jpeg') !== -1) {
    // use regex instead
    newURL = url.substring(0, url.lastIndexOf('normal.jpeg')) + 'bigger.jpeg';
    return convertToHttps(newURL);
  }
  else {
    return convertToHttps(url);
  }
}

module.exports = passport;


// identity scope profile returned
// const slackProfileJSON = {
// "ok":true,
// "user": {
  // "name":"Steve Tyler",
  // "id":"U16BXKJ4Q",
  // "email":"mail@steve-tyler.co.uk",
  // "image_24":"https:\/\/avatars.slack-edge.com\/2016-07-22\/62213153635_ef10a0839fa9ee4b403d_24.jpg",
  // "image_32":"https:\/\/avatars.slack-edge.com\/2016-07-22\/62213153635_ef10a0839fa9ee4b403d_32.jpg",
  // "image_48":"https:\/\/avatars.slack-edge.com\/2016-07-22\/62213153635_ef10a0839fa9ee4b403d_48.jpg",
  // "image_72":"https:\/\/avatars.slack-edge.com\/2016-07-22\/62213153635_ef10a0839fa9ee4b403d_72.jpg",
  // "image_192":"https:\/\/avatars.slack-edge.com\/2016-07-22\/62213153635_ef10a0839fa9ee4b403d_192.jpg",
  // "image_512":"https:\/\/avatars.slack-edge.com\/2016-07-22\/62213153635_ef10a0839fa9ee4b403d_192.jpg",
  // "image_1024":"https:\/\/avatars.slack-edge.com\/2016-07-22\/62213153635_ef10a0839fa9ee4b403d_192.jpg"
  //},
  // "team": {
  // "id":"T16BS5HAA","name":"collated dev",
  // "domain":"collated-dev",
  // "image_34":"https:\/\/a.slack-edge.com\/66f9\/img\/avatars-teams\/ava_0024-34.png",
  // "image_44":"https:\/\/a.slack-edge.com\/66f9\/img\/avatars-teams\/ava_0024-44.png",
  // "image_68":"https:\/\/a.slack-edge.com\/66f9\/img\/avatars-teams\/ava_0024-68.png",
  // "image_88":"https:\/\/a.slack-edge.com\/b3b7\/img\/avatars-teams\/ava_0024-88.png",
  // "image_102":"https:\/\/a.slack-edge.com\/b3b7\/img\/avatars-teams\/ava_0024-102.png",
  // "image_132":"https:\/\/a.slack-edge.com\/66f9\/img\/avatars-teams\/ava_0024-132.png",
  // "image_230":"https:\/\/a.slack-edge.com\/9e9be\/img\/avatars-teams\/ava_0024-230.png",
  // "image_default":true}
// }
