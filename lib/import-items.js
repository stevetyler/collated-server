var db = require('../database/database');
var async = require('async');
var Twitter = require('twitter');
var configAuth = require('../auth');

var User = db.model('User');
var Item = db.model('Item');

var newestTweetId = null;
var oldestTweetId = null;

// import favs for either loggedin user manually or for all twitter users via cron job
module.exports.importTwitterItems = function(user, options, done) {
  var client = new Twitter({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token_key: user.twitterAccessToken,
    access_token_secret: user.twitterSecretToken
  });
  var params = {
    screen_name: user.id,
  };
  var apiCalls = {
    favorites: 'favorites/list',
    tweetsAndRetweets: 'statuses/user_timeline'
  };
  var tweetArr = [];

  newestTweetId = user.twitterNewestTweetId;
  oldestTweetId = user.twitterOldestTweetId;

  setRequestParams(user, options, params);

  // iterate over apiCalls
  // Object.keys(apiCalls).forEach(function (key) {
  //   var path = apiCalls[key];
  //   client.get(path, params, function(error, tweets, response) {
  //     if (error) {
  //       return done(error);
  //     }
  //     if (options.getLatestLikes === 'true') {
  //       setUserLatestTweetIds(user, tweets, done);
  //     }
  //     if (options.getPreviousLikes === 'true') {
  //       setUserPreviousTweetIds(user, tweets, done);
  //     }
  //     saveAllTweetsAndUpdateUser(user, tweets, tweetArr, done);
  //   });
  // });

  client.get('favorites/list', params, function(error, tweets, response) {
    if (error) {
      return done(error);
    }
    if (options.getLatestLikes === 'true') {
      setUserLatestTweetIds(user, tweets, done);
    }
    if (options.getPreviousLikes === 'true') {
      setUserPreviousTweetIds(user, tweets, done);
    }
    saveAllTweetsAndUpdateUser(user, tweets, tweetArr, done);
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

function setUserPreviousTweetIds(user, tweets, done) {
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

function setUserLatestTweetIds(user, tweets, done) {
  if (user.twitterNewestTweetId) {
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
}

function saveAllTweetsAndUpdateUser(user, tweets, tweetArr, done) {
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
  //console.log('end');
  var items = [];

  function saveOneTweet(twitterItem, next) {
    var newItem = new Item(twitterItem);
    newItem.save(function(err, item) {
      if (err) {
        return next(err);
      }
      else {
        items.push(item);
        return next(null);
      }
    });
  }
  async.each(tweetArr, saveOneTweet, function(err) {
    if (err) {
      return done(err);
    }
    else {
      updateUserTweetIds(user, items, done);
    }
  });
}

function updateUserTweetIds(user, items, done) {
  User.findOne({id: user.id}).exec().then(function(user) {
    if(!user) {
			return done(new Error('User Not Found'));
		}
    user.twitterProfile.newestTweetId = newestTweetId;
    user.twitterProfile.oldestTweetId = oldestTweetId;
    return user.save();
  }).then(function() {
    return done(null, items);
  });
}
