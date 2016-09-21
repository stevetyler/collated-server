//var bcrypt = require('bcrypt');
//var LocalStrategy = require('passport-local').Strategy;
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var SlackStrategy = require('passport-slack').Strategy;

var configAuth = require('./../auth');
var db = require('./../database/database');

var User = db.model('User');

passport.use(new TwitterStrategy({
    consumerKey: configAuth.twitterAuth.consumerKey,
    consumerSecret: configAuth.twitterAuth.consumerSecret,
    callbackURL: configAuth.twitterAuth.callbackURL
  },
  function(token, tokenSecret, profile, done) {
    // { twitterProfile: { id: profile._json.id_str } } not working in Mongo 2.8
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
    // .then(function(user) {
    //   if (!user.twitterProfile._id) {
    //     var newProfileObj = Object.assign({}, user.twitterProfile);
    //     console.log('create new twitter profile', newProfileObj);
    //
    //     return user.twitterProfile.create(newProfileObj);
    //   }
    //   return user;
    // })
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
    User.findOne( {'slackProfile.slackUserId': profile.id} ).exec().then(function(user) {
      //console.log('user found', user);
      if (user) {
        user.apiKeys.slackAccessToken = accessToken;
        user.apiKeys.slackRefreshToken = refreshToken;
        user.name = profile._json.info.user.profile.real_name;
        user.email = profile._json.info.user.profile.email;
        user.imageUrl = profile._json.info.user.profile.image_24;
        user.slackProfile.isTeamAdmin = profile._json.info.user.is_admin;
        console.log('slack user exists');
        return user.save();
      }
      else {
        console.log('new slack user created');
        return User.create({
          id: profile._json.user,
          name: profile._json.info.user.profile.real_name,
          imageUrl: profile._json.info.user.profile.image_24,
          email: profile._json.info.user.profile.email,
          apiKeys: {
            slackAccessToken: accessToken,
            slackRefreshToken: refreshToken
          },
          slackProfile: {
            isTeamAdmin: profile._json.info.user.is_admin,
            slackUserId: profile._json.user_id,
            userName: profile._json.user,
            teamId: profile._json.team_id,
            teamDomain: profile._json.team,
            teamUrl: profile._json.url
          }
        });
      }
    })
    .then(function(user){
      console.log('user created or updated', user);
      return done(null, user);
    })
    .then(null, function(err){
      console.log(err);
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
