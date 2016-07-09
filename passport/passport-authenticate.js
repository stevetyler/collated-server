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
    User.findOne({ twitterId: profile._json.id_str }).exec().then(function(user) {
      if(user) {
        // check for schema version and update
        user.twitterAccessToken = token;
        user.twitterSecretToken = tokenSecret;
        user.imageUrl = modifyTwitterImageURL(profile._json.profile_image_url);
        // console.log(user.imageUrl);
        return user.save();
      } else {
        return User.create({
          imageUrl: modifyTwitterImageURL(profile._json.profile_image_url),
          name: profile._json.name,
          twitterAccessToken: token,
          twitterSecretToken:tokenSecret,
          twitterId:  profile._json.id_str
        });
      }
    })
    // ^^ find or create user
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
    User.findOne({ facebookId : profile.id}).exec().then(function(user) {
      if (user) {
        user.facebookAccessToken = accessToken;
        user.facebookSecretToken = secretToken;
        user.imageUrl = profile.photos[0].value;
        return user.save();
      } else {
        return User.create({
          name: profile.displayName,
          imageUrl: profile.photos[0].value,
          facebookAccessToken: accessToken,
          facebookSecretToken: secretToken,
          facebookId: profile.id
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
    clientID : configAuth.slackAuth.clientID,
    clientSecret : configAuth.slackAuth.clientSecret,
    callbackURL : configAuth.slackAuth.callbackURL,
    scope: 'identity.basic identity.email identity.avatar identity.team'
  },
  function(accessToken, refreshToken, profile, done) {
    console.log('profile returned', profile);

    // find slackProfileId instead, lookup syntax
    User.findOne( {id: profile._json.user} ).exec().then(function(user) {
      // make call to get email and avatar slack.com/api/users.identity?token=awarded_token
      if (user) {
        user.apiKeys.slackAccessToken = accessToken;
        user.apiKeys.slackRefreshToken = refreshToken;
        //user.slackProfile.userId = profile.id;
        console.log('slack user exists', user);
        return user.save();
      } else {
        return User.create({
          id: profile._json.user,
          name: profile.displayName,
          apiKeys: {
            slackAccessToken: accessToken,
            slackRefreshToken: refreshToken
          },
          slackProfile: {
            userId: profile._json.user_id,
            userName: profile._json.user,
            teamId: profile._json.team_id,
            teamDomain: profile._json.team,
            teamUrl: profile._json.url
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
