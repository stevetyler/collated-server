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
  var likesParams = setRequestParams(profile.latestLikeId, profile.oldestlikeId, options, params);
  var tweetParams = setRequestParams(profile.latestTweetId, profile.oldestTweetId, options, params);

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

function setRequestParams(latestId, oldestId, options, params) {
  // must pass empty object as first argument or params will be mutated
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

function updateUserIds(user, options, objectOfArrays) {
  var latestIds;
  var previousIds;

  if (options.getLatest) {
    latestIds = setUserIdsForLatest(objectOfArrays.likes, objectOfArrays.timeline);
  }
  else if (options.getPrevious) {
    previousIds = setUserIdsForPrevious(objectOfArrays.likes, objectOfArrays.timeline);
  }

  User.findOne({id: user.id}).exec().then(function(user) {
    if(!user) {
			return new Error('User Not Found');
		}
    user.twitterProfile.latestLikeId = latestIds.latestLikeId;
    user.twitterProfile.previousLikeId = previousIds.previousLikeId;
    user.twitterProfile.latestTweetId = latestIds.latestTweetId;
    user.twitterProfile.previousTweetId = previousIds.oldestTweetId;
    return user.save();
  });
}

function setUserIdsForLatest(user, arr) {
  var ids = {
    latestLikeId: null,
    previousLikeId: null,
    latestTweetId: null,
    previousTweetId: null
  };

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

function setUserIdsForPrevious(user, arr) {
  var ids = {
    latestLikeId: null,
    previousLikeId: null,
    latestTweetId: null,
    previousTweetId: null
  };

  if (arr.length < 2) {
    return [];
  }
  if (latestTweetId) {
    arr.splice(0,1); // remove duplicate max id at beginning
  }
  else {
    ids.latestId = arr[0].id; // latestId
  }
  ids.oldestId = arr[arr.length-1].id; // oldestId
  return ids;
}



function saveTweetsToDb(user, tweets) {
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
      updateUserIds(user, options, objectOfArrays);
      var tweetArr = objectOfArrays.likes.concat(objectOfArrays.timeline);

      return tweetArr;
    })
    .then(function(items) {
      saveTweetsToDb(items);
      return done(null, items);
    })
    .then(null, function(err) {
      return done(err);
    });
  // update timeline window on user profile
  // save to DB
  // pass [Item] to done()
};
