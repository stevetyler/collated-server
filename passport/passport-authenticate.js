var bcrypt = require('bcrypt');
//var LocalStrategy = require('passport-local').Strategy;
var logger = require('nlogger').logger(module);
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;

var configAuth = require('./../auth');
var db = require('./../database/database');

var User = db.model('User');
var Tag = db.model('Tag');

passport.use(new TwitterStrategy({
    consumerKey: configAuth.twitterAuth.consumerKey,
    consumerSecret: configAuth.twitterAuth.consumerSecret,
    callbackURL: configAuth.twitterAuth.callbackURL
  },
  function(token, tokenSecret, profile, done) {
    User.findOne({ twitterId: profile._json.id_str }).exec().then(function(user) {
      if(user) {
        user.twitterAccessToken = token;
        user.twitterSecretToken = tokenSecret;

        return user.save();
      } else {
        // must return promise
        return User.create({
          id: profile._json.screen_name,
          imageUrl: modifyTwitterURL(profile._json.profile_image_url),
          name: profile._json.name,
          twitterAccessToken: token,
          twitterSecretToken:tokenSecret,
          twitterId:  profile._json.id_str
        });
      }
    })
    // ^^ find or create user
    .then(function(user){
      return Tag.findOne({id: 'Undefined', user: user.id}).exec().then(function(tag){
        if (!tag) {
          return Tag.create({
            id: 'Undefined',
            colour: 'cp-colour-1',
            user: user.id,
            itemCount: 1
          }).then(function(){
            return user;
          });
        }
        return user;
      });
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

// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     User.findOne({id: username}, function (err, user){
//       if (err) {
//         return done(err);
//       }
//       if (!user) {
//         return done(null, null, {message: 'Incorrect username'});
//       }
//       bcrypt.compare(password, user.password, function(err, res) {
//         if (err) {
//           logger.error('Bcrypt password compare error: ', err);
//         }
//         if (res) {
//           // logger.info('Bcrypt passed: ', res);
//           // logger.info('local returning user: ', user.id);
//           return done(null, user);
//         } else {
//           // logger.warn('Bcrypt failed: ', 'query: ',password);
//           // logger.warn( ' user.password: ', user.password);
//           return done(null, false, { message: 'Incorrect password.' } );
//         }
//       });
//     });
//   }
// ));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  // Async function, done was being called every time
  console.log("user deserialize", id);
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
