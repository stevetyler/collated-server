var bcrypt = require('bcrypt');
//var LocalStrategy = require('passport-local').Strategy;
var logger = require('nlogger').logger(module);
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

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
        user.imageUrl = modifyTwitterURL(profile._json.profile_image_url);
        // console.log(user.imageUrl);
        return user.save();
      } else {
        // must return promise
        return User.create({
          id: profile._json.screen_name, // generate
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
        } else {
          return user;
        }
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

passport.use(new FacebookStrategy({
    clientID : configAuth.facebookAuth.clientID,
    clientSecret : configAuth.facebookAuth.clientSecret,
    callbackURL : configAuth.facebookAuth.callbackURL,
    profileFields : ['id', 'displayName', 'photos', 'profileUrl']
  },
  function(accessToken, secretToken, profile, done) {
    var newId;

    User.findOne({ facebookId : profile.id}).exec().then(function(user) {
      if (user) {
        user.facebookAccessToken = accessToken;
        user.facebookSecretToken = secretToken;
        user.imageUrl = profile.photos[0].value;
        return user.save();
      } else {
        return user;
      }
    })
    .then(function(user) {
      //console.log('findAndGenerate called');
      console.log('user', user);

      if (!user) {
        var queryId = profile.displayName.toLowerCase().split(' ').join('.');
        console.log('queryId', queryId);

        return User.find({id: {$regex: queryId, $options: "i"}}, function(users) {
          var tmp = 1;

          console.log('users found', users);
          // find all ids that contain queryId and increment if found
          if (!users) {
            newId = queryId;
          }
          else if (users && users.length === 1) {
            newId = queryId + '.' + '2';
          }
          else if (users && users.length > 1) {
            // search for highest id eg steve.tyler.3
            users.forEach(function(user) {
              var userId = user.id.split('.');
              var num = parseInt(userId[2], 10);

              if (userId.length === 2 ) {
                if (num > tmp) {
                  tmp = num;
                }
              }
            });
            tmp++;
            newId = queryId + '.' + tmp.toString();
          }
          console.log('newId', newId);
        });
      }
      else {
        return user;
      }
    })
    .then(function(user) {
      if (newId) {
        return User.create({
          id: newId,
          name: profile.displayName,
          imageUrl: profile.photos[0].value,
          facebookAccessToken: accessToken,
          facebookSecretToken: secretToken,
          facebookId: profile.id
        });
      }
      else {
        return user;
      }
    })
    .then(function(user){
      console.log('find tag for user', user);
      if (newId) {
        return Tag.create({
          id: 'Undefined',
          colour: 'cp-colour-1',
          user: user.id,
          isReserved: true
        }
        // {
        //   id: 'Private',
        //   colour: 'cp-colour-1',
        //   user: user.id,
        //   isReserved: true,
        //   isPrivate: true
        // }
        )
        .then(function() {
          return user;
        });
      } else {
        return user;
      }
    })
    .then(function(user){
      if (user) {
        console.log('new fb user created', user);
      }
      return done(null, user);
    })
    .then(null, function(err){
      console.log(err);
      done(err);
    });
  }
));

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


// function findAndGenerateId(user) {
//   console.log('findAndGenerate called');
//
//   if (!user) {
//     var queryId = displayName.toLowerCase().split(' ').join('.');
//     console.log('queryId', queryId);
//
//     User.find({id: {$regex: queryId, $options: "i"}}, function(users) {
//       var tmp = 0;
//       //var newId;
//       // find all ids that contain queryId and increment if found
//       if (!users) {
//         newId = queryId;
//       }
//       else if (users.length === 1) {
//         newId = queryId + '.' + '1';
//       }
//       else if (users.length > 1) {
//         // search for highest id eg steve.tyler.3
//         users.forEach(function(user) {
//           var userId = user.id.split('.');
//           var num = parseInt(userId[2], 10);
//
//           if (userId.length === 2 ) {
//             if (num > tmp) {
//               tmp = num;
//             }
//           }
//         });
//         tmp++;
//         newId = queryId + '.' + tmp.toString();
//       }
//       console.log('newId', newId);
//     });
//   }
//   return user;
// }

function convertToHttps(url) {
  return url.replace(/^http:\/\//i, 'https://');
}

function modifyTwitterURL(url) {
  var newUrl;

  if (url.indexOf('default_profile') !== -1) {
    return convertToHttps(url);
  }
  else if (url.lastIndexOf('normal.jpg') !== -1) {
    // use regex instead
    newUrl = url.substring(0, url.lastIndexOf('normal.jpg')) + 'bigger.jpg';
    return convertToHttps(newUrl);
  }
  else if (url.lastIndexOf('normal.jpeg') !== -1) {
    // use regex instead
    newUrl = url.substring(0, url.lastIndexOf('normal.jpeg')) + 'bigger.jpeg';
    return convertToHttps(newUrl);
  }
  else {
    return convertToHttps(url);
  }
}




module.exports = passport;
