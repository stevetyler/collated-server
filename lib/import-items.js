var db = require('../database/database');
var async = require('async');
var Twitter = require('twitter');
var configAuth = require('../auth');

var User = db.model('User');
var Item = db.model('Item');


// import favs for either loggedin user manually or for all twitter users via cron job
// async operation, must provide callback
module.exports.importItems = function(user, options, done) {
  var client = new Twitter({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token_key: user.twitterAccessToken,
    access_token_secret: user.twitterSecretToken
  });
  var params = {
    screen_name: user.id,
  };

  if (options.getLatestLikes && user.twitterNewestTweetId) {
    params.since_id = user.twitterNewestTweetId;
  }
  //
  // if (options.getPreviousLikes && user.twitterOldestTweetId ) {
  //   params.max_id = user.twitterOldestTweetId;
  // }
  params.count = options.amount;
  console.log('options', options);

  client.get('favorites/list', params, function(error, tweets, response) {
    var tweetArr = [], newestTweetId, oldestTweetId;

    //console.log('tweets array', tweets[0].id, tweets[1].id);
    if (error) {
      return done(error);
    }
    if (user.twitterNewestTweetId || user.twitterOldestTweetId) {
      tweets.splice(0, tweets[tweets.length - 1]); // remove duplicate id
      if (tweets.length < 2) {
        return done(null, []);
      }
      //console.log('id removed from tweets');
    }
    if (!params.since_id || options.getLatestLikes) {
      newestTweetId = tweets[0].id;
      //oldestTweetId = tweets[tweets.length - 1].id;
    }
    if (!params.since_id || options.getPreviousLikes) {
      oldestTweetId = tweets[tweets.length - 1].id;
    }
    tweets.forEach(function(tweet) {
      var twitterItem = {
        body: tweet.text,
        createdDate: tweet.created_at,
        author: tweet.user.screen_name,
        user: user.id,
        twitterTweetId: tweet.id, // loop through tweets
        tags: ['Undefined']
      };
      tweetArr.push(twitterItem);
    });
    console.log('end');
    var items = [];

    function saveOneTweet(twitterItem, done) {
      var newItem = new Item(twitterItem);
      newItem.save(function(err, item) {
        if (err) {
          return done(err);
        }
        else {
          items.push(item);
          return done(null); // signals end of save
        }
      });
    }
    async.each(tweetArr, saveOneTweet, function(err) {
      if (err) {
        return done(err);
      }
      else {
        User.findOneAndUpdate({id: user.id}, {
          twitterOldestTweetId: oldestTweetId,
          twitterNewestTweetId: newestTweetId
        }, function(err) {
          if (err) {
            return done(err);
          }
          else {
            return done(null, items);
          }
        });
      }
    });
  });
};
