var async = require('async');
var BPromise = require('bluebird'); // Promise gives redefinition error
var Twitter = require('twit');

var db = require('../database/database');
var configAuth = require('../auth');
var User = db.model('User');
var Item = db.model('Item');

var fetchRelevantTweets = function(user, options) {
  var client = new Twitter({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token: user.apiKeys.twitterAccessToken,
    access_token_secret: user.apiKeys.twitterSecretToken
  });
  var params = {
    screen_name: user.id,
  };
  var profile = user.twitterProfile;
  var likesParams = getRequestParams(profile.latestLikeId, profile.oldestlikeId, options, params);
  var tweetParams = getRequestParams(profile.latestTweetId, profile.oldestTweetId, options, params);

  var userLikesPromise = client.get('favorites/list', likesParams);
  var userTimelinePromise = client.get('statuses/user_timeline', tweetParams);

  BPromise.join(userLikesPromise, userTimelinePromise, function(likes, timeline) {
    var tweetsReceived = {
      likes: likes.data,
      timeline: timeline.data
    };
    return tweetsReceived;
  }).then(null, function(err) {
    console.log(err);
  });
};

function getRequestParams(latestId, oldestId, options, params) {
  // must pass {} as first argument or params will be mutated
  return Object.assign({},
    params,
    paramsForLatest(options.getLatest, latestId),
    paramsForPrevious(options.getPrevious, oldestId, options.amount)
  );
}

function paramsForLatest(opt, latestId) {
  return (opt === 'true') ?
  {
    since_id: latestId,
    count: 200
  } :
  {};
}

function paramsForPrevious(opt, oldestId, amount) {
  if (opt === 'true') {
    return {
      max_id: oldestId,
      count: oldestId ? parseInt(amount, 10) + 1 : amount
    };
  } else {
    return {};
  }
}

function updateUserIds(user, objectOfArrays) {
  var latestLikeId = objectOfArrays.likes[0];
  var oldestLikeId = objectOfArrays.likes[objectOfArrays.likes.length-1];
  var latestTweetId = objectOfArrays.timeline[0];
  var oldestTweetId = objectOfArrays.likes[objectOfArrays.timeline.length-1];

  User.findOne({id: user.id}).exec().then(function(user) {
    if(!user) {
			return new Error('User Not Found');
		}
    user.twitterProfile.latestLikeId = latestLikeId;
    user.twitterProfile.oldestLikeId = oldestLikeId;
    user.twitterProfile.latestTweetId = latestTweetId;
    user.twitterProfile.oldestTweetId = oldestTweetId;
    return user.save();
  });
}

function setUserIdsForPrevious(user, arr) {
  var ids = new Array(2);

  if (arr.length < 2) {
    return [];
  }
  if (latestTweetId) {
    arr.splice(0,1); // remove duplicate max id at beginning
  }
  else {
    ids[0] = arr[0].id; // latestId
  }
  ids[1] = arr[arr.length-1].id; // oldestId
  return ids;
}

function setUserIdsForLatest(user, arr) {
  if (user.twitterProfile.latestTweetId) {
    if (!arr.length) {
      return [];
    }
    if (arr.length === 1 && arr[0].id === parseInt(latestTweetId, 10)) {
      return [];
    }
    if (arr[arr.length-1].id == user.twitterProfile.latestTweetId) {
      arr.pop();
    }
    latestTweetId = tweets[0].id;
  }
}

function saveAllTweets(user, tweets) {
  var twitterItemsArr = [];
  var items = [];

  tweets.forEach(function(tweet) {
    var twitterItem = {
      body: tweet.text,
      createdDate: tweet.created_at,
      author: tweet.user.screen_name,
      user: user.id,
      twitterTweetId: tweet.id,
      tags: ['undefined'],
      type: 'twitter' // tweet or twitterLike
    };
    twitterItemsArr.push(twitterItem);
  });
  //console.log('end');

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
  async.each(twitterItemsArr, saveOneTweet, function(err) {
    if (err) {
      return new Error(err);
    }
  });
}

module.exports.importTwitterItems = function(user, options, done) {
  // fetch relevant tweets -> [ [Item Tweet], [Item Favorite] ]
  fetchRelevantTweets(user, options)
    .then(function(objectOfArrays) {
      updateUserIds(user, objectOfArrays);
      var tweetArr = objectOfArrays.likes.concat(objectOfArrays.timeline);

      return tweetArr;
    })
    .then(function(items) {
      saveToDb(items);
      return items;
    })
    .then(done);
  // update timeline window on user profile
  // save to DB
  // pass [Item] to done()
};
