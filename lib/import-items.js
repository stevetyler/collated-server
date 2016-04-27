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
  var params = {
    screen_name: user.id,
  };

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
      console.log('newestId', user.twitterNewestTweetId);
      params.count = parseInt(options.amount, 10) + 1;
    }
    else {
      //params.max_id = user.twitterOldestTweetId;
      params.count = options.amount;
      //console.log('amount', options.amount);
    }
  }

  console.log(params, options);
  //console.log('options', options);

  // 'statuses/user_timeline'
  client.get('favorites/list', params, function(error, tweets, response) {
    var newestTweetId = user.twitterNewestTweetId;
    var oldestTweetId = user.twitterOldestTweetId;
    var tweetArr = [];

    console.log('tweets length', tweets.length);
    //console.log('tweets array', tweets[0].id, tweets[1].id);
    if (error) {
      return done(error);
    }
    if (newestTweetId || oldestTweetId) {
      if (tweets.length < 2) {
        return done(null, []);
      }
    }
    if (newestTweetId && options.getPreviousLikes) {
      tweets.splice(0,1); // remove duplicate max id
      console.log('splice', tweets.length);
    }
    if (!newestTweetId || options.getLatestLikes) {
      newestTweetId = tweets[0].id;
      console.log('set newest id', newestTweetId);
    }
    if (options.getPreviousLikes) {
      oldestTweetId = tweets[tweets.length - 1].id;
      console.log('set oldest id', oldestTweetId);
    }
    tweets.forEach(function(tweet) {
      var twitterItem = {
        body: tweet.text,
        createdDate: tweet.created_at,
        author: tweet.user.screen_name,
        user: user.id,
        twitterTweetId: tweet.id,
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
