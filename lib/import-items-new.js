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
    if (error && typeof done === 'function') {
      return done(error);
    }
    if (options.getLatestLikes === 'true') {
      setUserLatestTweetIds(user, tweets, newestTweetId, oldestTweetId, done);
    }
    if (options.getPreviousLikes === 'true') {
      setUserPreviousTweetIds(user, tweets, newestTweetId, oldestTweetId, done);
    }
    saveAllTweetsAndUpdateUser(user, tweets, tweetArr, newestTweetId, oldestTweetId, done);
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

function saveAllTweetsAndUpdateUser(user, tweets, tweetArr, newestTweetId, oldestTweetId, done) {
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
      if (err && typeof done === 'function') {
        return done(err);
      }
      else if (typeof done === 'function') {
        items.push(item);
        return done(null);
      }
    });
  }
  async.each(tweetArr, saveOneTweet, function(err) {
    if (err && typeof done === 'function') {
      return done(err);
    }
    else {
      User.findOneAndUpdate({id: user.id}, {
        twitterNewestTweetId: newestTweetId,
        twitterOldestTweetId: oldestTweetId
      }, function(err) {
        if (err && typeof done === 'function') {
          return done(err);
        }
        else if (typeof done === 'function') {
          return done(null, items);
        }
      });
    }
  });
}

function setUserPreviousTweetIds(user, tweets, newestTweetId, oldestTweetId, done) {
  if (tweets.length < 2 && typeof done === 'function') {
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

function setUserLatestTweetIds(user, tweets, newestTweetId, oldestTweetId, done) {
  if (user.twitterNewestTweetId) {
    //console.log('first tweet id', typeof(tweets[0].id), 'newest id', typeof(newestTweetId));
    if (!tweets.length && typeof done === 'function') {
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
}
