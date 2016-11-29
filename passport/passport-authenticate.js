'use strict';
//var bcrypt = require('bcrypt');
//var LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const SlackStrategy = require('./passport-slack-updated');
//const SlackStrategy = require('passport-slack').Strategy;

const configAuth = require('./../auth');
const db = require('./../database/database');
const formatGroupId = require('./../lib/format-group-id');

const User = db.model('User');
const UserGroup = db.model('UserGroup');

passport.use(new TwitterStrategy({
    consumerKey: configAuth.twitterAuth.consumerKey,
    consumerSecret: configAuth.twitterAuth.consumerSecret,
    callbackURL: configAuth.twitterAuth.callbackURL
  },
  function(token, tokenSecret, profile, done) {
    User.findOne({ 'twitterProfile.twitterId': profile._json.id_str } ).exec().then(function(user) {
      console.log('user found', user);
      if (user) {
        user.apiKeys.twitterAccessToken = token;
        user.apiKeys.twitterSecretToken = tokenSecret;
        user.imageUrl = modifyTwitterImageURL(profile._json.profile_image_url);
        //user.twitterProfile.twitterId = profile._json.id_str;
        // console.log(user.imageUrl);
        return user.save();
      } else {
        return User.create({
          imageUrl: modifyTwitterImageURL(profile._json.profile_image_url),
          name: profile._json.name,
          apiKeys: {
            twitterAccessToken: token,
            twitterSecretToken:tokenSecret,
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
        return user.save();
      } else {
        return User.create({
          name: profile.displayName,
          imageUrl: profile.photos[0].value,
          apiKeys: {
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
      console.log('fb user', user);
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
    //scope: 'identity.basic,identity.team,identity.email,identity.avatar'
    scope: 'users:read'
  },
  function(accessToken, refreshToken, profile, done) {
    console.log('slack profile received', JSON.stringify(profile._json));
    const profileObj = {
      teamDomain: profile._json.info.team.domain,
      teamId: profile._json.info.team.id,
      teamImageUrl: profile._json.info.team.image_34,
      userEmail: profile._json.info.user.email,
      userId: profile._json.info.user.id,
      userImageUrl: profile._json.info.user.image_24,
      userName: profile._json.info.user.name,
    };
    console.log('profileObj', profileObj);

    UserGroup.findOne({slackTeamId: profileObj.teamId}).then(group => {
      if (!group) {
  			let newId = formatGroupId(profileObj.teamDomain);
        console.log('new group id created', newId);
  			let newUserGroup = new UserGroup({
  				id: newId,
  				image: '/img/slack/default.png',
          slackTeamId: profileObj.teamId,
          slackTeamDomain: profileObj.teamDomain
        });

  			return newUserGroup.save();
      }
      return group;
    }).then(group => {
      Object.assign(profileObj, {userGroup: group.id});
      return User.findOne( {'slackProfile.userId': profileObj.userId} );
    })
    .then(function(user) {
      if (user) {
        console.log('slack user exists');
        Object.assign(user, {
          apiKeys: {
            slackAccessToken: accessToken,
            slackRefreshToken: refreshToken,
          },
          name: profileObj.userName,
          email: profileObj.userEmail,
          imageUrl: profileObj.userImageUrl
        });
        return user.save();
      }
      else {
        console.log('new slack user created');
        return User.create({
          //id: profileObj.userIdName,
          apiKeys: {
            slackAccessToken: accessToken,
            slackRefreshToken: refreshToken
          },
          email: profileObj.userEmail,
          imageUrl: profileObj.userImageUrl,
          name: profileObj.userName,
          slackProfile: {
            userId: profileObj.userId,
            teamId: profileObj.teamId,
            teamDomain: profileObj.teamDomain,
          },
          userGroup: profileObj.userGroup
        });
      }
    })
    .then(function(user){
      console.log('user created or updated', user);
      return done(null, user);
    })
    .catch(function(err){
      console.log('slack error', JSON.stringify(err));
      done(err);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  // Async function, done was being called every time
  //console.log("user deserialize", id);
  User.findOne({_id: id}, function(err, user) {
    if (err) {
      return done(err);
    }
    return done(null, user);
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
