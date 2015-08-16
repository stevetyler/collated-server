var db = require('../database/database');
var async = require('async');
var Twitter = require('twitter');
var configAuth = require('../auth');

var User = db.model('User');
var Fav = db.model('Fav');


// import favs for either loggedin user manually or for all twitter users via cron job
// async operation, must provide callback
module.exports.importFavs = function(user, done) {

  var client = new Twitter({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token_key: user.twitterAccessToken,
    access_token_secret: user.twitterSecretToken
  });

  var params = {
    screen_name: user.id,
    count: 10,
    // since_id: user.twitterLastTweetId
  };

  console.log(params);

  client.get('favorites/list', params, function(error, tweets, response) {
    var tweetArr = [];

    if (error) {
      console.log(error);
      return done(error);
    }

    // console.log(tweets[0]);  // The favorites.
    // console.log(response);  // Raw response object.
    // create fav from tweets array and store twitterLastTweetId for user depending on order received

    // if (tweets.length === 0 || tweets[0].id == user.twitterLastTweetId) {
    //   return done(null, []); // must return array of Mongo objects
    // }
    console.log(tweets.length);
    console.log(tweets[0].id);

    var lastTweetId = tweets[0].id;

    // put fav tweets in arr using foreach loop;
    tweets.forEach(function(tweet) {
      twitterFav = {
        body: tweet.text,
        createdDate: tweet.created_at,
        author: tweet.user.screen_name,
        user: user.id,
        twitterTweetId: tweet.id, // loop through tweets
        tags: ['JavaScript']
      };
      // console.log(tweet.id);
      tweetArr.push(twitterFav);
    });

    console.log('end');
    // call create function of fav model to create favs
    // eg check connection.model('fav')
    // forEach is sync, .save is async, create is sync
    // cannot use create because it doesn't return favs, use async module
    
    // array of Mongo fav objects
    var favs = [];

    function saveOneTweet(twitterFav, done) {
      var newFav = new Fav(twitterFav);
      newFav.save(function(err, fav) {
        if (err) {
          return done(err);
        }
        else {
          favs.push(fav);
          return done(null); // signals end of save
        }
      });
    }

    async.each(tweetArr, saveOneTweet, function(err) {
      if (err) {
        return done(err);
      }
      else {
        User.findOneAndUpdate({id: user.id}, {twitterLastTweetId: lastTweetId}, function(err) {
          if (err) {
            return done(err);
          }
          else {
            return done(null, favs);
          }
        });
      }
    });
  });
};


