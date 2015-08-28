 // var bcrypt = require('bcrypt');
var db = require('./../database/database');
var LocalStrategy = require('passport-local').Strategy;
var logger = require('nlogger').logger(module);
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var configAuth = require('./../auth'); // import Twitter consumer key & secret

var User = db.model('User');
var Tag = db.model('Tag');
var tagColours = ['white', 'gold', 'pink', 'plum', 'orange', 'darkorange', 'salmon', 'chocolate', 'indianred', 'cornflowerblue', 'royalblue', 'slateblue', 'mediumseagreen', 'darkcyan', 'dimgray'];

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({id: username}, function (err, user){
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, null, {message: 'Incorrect username'});
      }
      bcrypt.compare(password, user.password, function(err, res) {
        if (err) {
          logger.error('Bcrypt password compare error: ', err);
        }
        if (res) {
          // logger.info('Bcrypt passed: ', res);
          // logger.info('local returning user: ', user.id);
          return done(null, user);
        } else {
          // logger.warn('Bcrypt failed: ', 'query: ',password);
          // logger.warn( ' user.password: ', user.password);
          return done(null, false, { message: 'Incorrect password.' } );
        }
      });
    });
  }
));
 
// console.log(configAuth.twitterAuth.callbackURL);

passport.use(new TwitterStrategy({
    // pull in the app consumer key and secret from auth.js file
    consumerKey: configAuth.twitterAuth.consumerKey,
    consumerSecret: configAuth.twitterAuth.consumerSecret,
    callbackURL: configAuth.twitterAuth.callbackURL
  },
  // twitter will send back token and profile
  function(token, tokenSecret, profile, done) {
    // console.log(profile);
    var newUser;

    User.findOne({ twitterId: profile._json.id_str }, function(err, user) {
      logger.info('user found from twitter: ', profile);
      if(err) {
        console.log(err);
        done(err);
      }
      if(user) {
        // update user tokens
        User.findOneAndUpdate({twitterId: profile._json.id_str}, {twitterAccessToken: token, twitterSecretToken: tokenSecret}, function(err, user) {
          return done(err, user);
        });
      } else {
        var newUser = {};

        newUser.id = profile._json.screen_name;
        newUser.imageUrl = modifyTwitterURL(profile._json.profile_image_url);
        newUser.name = profile._json.name;
        newUser.twitterAccessToken = token;
        newUser.twitterSecretToken = tokenSecret;
        newUser.twitterId = profile._json.id_str;
        newUser.tagColoursAvailable = tagColours;

        User.create(newUser, function(err, user) {
          if (err) {
            logger.error('User not Created', err);
            // must return err or done will be called twice
            return done(err);
          }
          newUser = user;
          // logger.info('User Created: ', user.id);
          return done(null, user);
        });
      }
      // error if tag exists - can't set headers before they are sent
      // Tag.findOne({id: 'Undefined'}, function(err, tag) {
      //   if (tag) {
      //     logger.error('Tag exists', tag);
      //     return done(null, newUser);
      //   }
      //   else {
      //     // console.log('Creating undefined tag');
      //     defaultTag = {
      //       id: 'Undefined',
      //       colour: 'white',
      //       user: newUser.id
      //     };
      //     Tag.create(defaultTag, function(err, tag) {
      //       done(err, tag);
      //     });
      //   }
      //   return done(null, newUser);
      // });
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  // Async function, done was being called every time
  User.findOne({id: id}, function(err, user) {
    if (err) {
      return done(err);
    }
    return done(null, user);
  });
});

function modifyTwitterURL(url) {
  var newUrl;

  if (url.indexOf('default_profile') !== -1) {
    return url;
  }
  else if (url.lastIndexOf('normal.jpg') !== -1) {
    // use regex instead
    newUrl = url.substring(0, url.lastIndexOf('normal.jpg')) + 'bigger.jpg';
    return newUrl;
  }
  else if (url.lastIndexOf('normal.jpeg') !== -1) {
    // use regex instead
    newUrl = url.substring(0, url.lastIndexOf('normal.jpeg')) + 'bigger.jpeg';
    return newUrl;
  }
  else {
    return url;
  }
}




module.exports = passport;