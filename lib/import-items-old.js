var db = require('../database/database');
var async = require('async');
var Twitter = require('twitter');
var configAuth = require('../auth');

var User = db.model('User');
var Item = db.model('Item');

// import favs for either loggedin user manually or for all twitter users via cron job

module.exports.importItems = function(user, options, done) {
  var client = new Twitter({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token_key: user.twitterAccessToken,
    access_token_secret: user.twitterSecretToken
  });
  var newestTweetId = user.twitterNewestTweetId;
  var oldestTweetId = user.twitterOldestTweetId;
  var params = {
    screen_name: user.id,
  };
  var tweetArr = [];

  setRequestParams(user, options, params);

  // 'statuses/user_timeline'
  client.get('favorites/list', params, function(error, tweets, response) {
    if (error) {
      return done(error);
    }
    if (options.getPreviousLikes === 'true') {
      if (tweets.length < 2) {
        return done(null, []);
      }
      if (newestTweetId) {
        tweets.splice(0,1); // remove duplicate max id at beginning
      }
      else {
        newestTweetId = tweets[0].id;
      }
      oldestTweetId = tweets[tweets.length-1].id;
    }
    if (options.getLatestLikes === 'true' && user.twitterNewestTweetId) {
      //console.log('first tweet id', typeof(tweets[0].id), 'newest id', typeof(newestTweetId));
      if (!tweets.length) {
        return done(null, []);
      }
      if (tweets.length === 1 && tweets[0].id === parseInt(newestTweetId, 10)) {
        return done(null, []);
      }
      if (tweets[tweets.length-1].id == user.twitterNewestTweetId) {
        tweets.pop();
      }
      newestTweetId = tweets[0].id;
    }
    tweets.forEach(function(tweet) {
      var twitterItem = {
        body: tweet.text,
        createdDate: tweet.created_at,
        author: tweet.user.screen_name,
        user: user.id,
        twitterTweetId: tweet.id,
        tags: ['undefined']
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
          twitterNewestTweetId: newestTweetId,
          twitterOldestTweetId: oldestTweetId
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

function setRequestParams(user, options, params) {
  if (options.getLatestLikes === 'true') {
    params.since_id = user.twitterNewestTweetId;
    params.count = 200;
  }
  if (options.getPreviousLikes === 'true') {
    if (user.twitterOldestTweetId) {
      params.max_id = user.twitterOldestTweetId;
      params.count = options.amount;
    }
    if (user.twitterNewestTweetId) {
      params.max_id = user.twitterOldestTweetId;
      params.count = parseInt(options.amount, 10) + 1;
    }
    else {
      params.count = options.amount;
    }
  }
}
