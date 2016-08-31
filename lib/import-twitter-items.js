var BPromise = require('bluebird'); // Promise gives redefinition error
var Twit = require('twit');

var db = require('../database/database');
var configAuth = require('../auth');
var User = db.model('User');
var Item = db.model('Item');


function fetchRelevantTwitterItems(user, options) {
  var client = new Twit({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token: user.apiKeys.twitterAccessToken,
    access_token_secret: user.apiKeys.twitterSecretToken
  });
  var params = {
    screen_name: user.id,
  };
  var profile = user.twitterProfile;
  var likesParams = setRequestParams(profile.latestLikeId, profile.oldestLikeId, options, params);
  var tweetParams = setRequestParams(profile.latestTweetId, profile.oldestTweetId, options, params);

  var userLikesPromise = client.get('favorites/list', likesParams);
  var userTimelinePromise = client.get('statuses/user_timeline', tweetParams);

  // console.log('options', options, 'likesParams', likesParams, 'tweetParams', tweetParams);
  return BPromise.join(userLikesPromise, userTimelinePromise, function(likes, timeline) {
    var twitterObject = {
      likes: likes.data,
      timeline: timeline.data
    };
    // console.log('tweets received', twitterObject.likes.length, twitterObject.timeline.length);
    return twitterObject;
  }).then(null, function(err) {
    console.log(err);
  });
}

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

function updateUserIds(user, options, twitterObject) {
  var latestIds;
  var previousIds;
  var profile = user.twitterProfile;
  // console.log('updateUserIds profile', profile, 'options', options);

  if (options.getLatest === 'true') {
    // console.log('getLatest called');
    latestIds = Object.assign({},
      setUserIdsForLatest('likes', twitterObject.likes, profile.latestLikeId),
      setUserIdsForLatest('tweets', twitterObject.timeline, profile.latestTweetId)
    );
    console.log('latestIds to set', latestIds);
    return saveUserIds(user.id, latestIds);
  }
  else if (options.getPrevious === 'true') {
    // console.log('getPrevious called');
    previousIds = Object.assign({},
      setUserIdsForPrevious('likes', twitterObject.likes, profile.latestLikeId),
      setUserIdsForPrevious('tweets', twitterObject.timeline, profile.latestTweetId)
    );
    console.log('previousIds to set', previousIds);
    return saveUserIds(user.id, previousIds);
  }
}

function saveUserIds(userId, ids) {
  return User.findOne({id: userId}).exec().then(function(user) {
    //console.log('user to save', user);
    if(!user) {
			return new Error('User Not Found');
		}
    Object.assign(user.twitterProfile, ids);
    //console.log('user saved', user);
    return user.save();
  }, function(err) {
    console.log(err);
  });
}

function setUserIdsForLatest(type, arr, latestId) {
  var newId = {};

  if (latestId) {
    if (!arr.length) {
      return {};
    }
    if (arr.length === 1 && arr[0].id === parseInt(latestId, 10)) {
      return {};
    }
    if (arr[arr.length-1].id == latestId) {
      arr.pop();
    }
    if (type === 'likes') {
      newId.latestLikeId = arr[0].id;
    }
    if (type === 'tweets') {
      newId.latestTweetId = arr[0].id;
    }
  }
  //console.log('setUserIdsForLatest', newId);
  return newId;
}

function setUserIdsForPrevious(type, arr, latestId) {
  var newIds = {};
  //console.log('setPrevious latestId', latestId);

  if (arr.length < 2) {
    return {};
  }
  if (latestId) {
    arr.splice(0,1); // remove duplicate max id at beginning
  }
  else if (type === 'likes') {
    newIds.latestLikeId = arr[0].id;
  }
  else if (type === 'tweets') {
    newIds.latestTweetId = arr[0].id;
  }

  if (type === 'likes') {
    newIds.oldestLikeId = arr[arr.length-1].id;
  }
  if (type === 'tweets') {
    newIds.oldestTweetId = arr[arr.length-1].id;
  }
  //console.log('setUserIdsForPrevious', newIds);
  return newIds;
}

function formatTwitterItem(userId, type, tweet) {
  return {
    body: tweet.text,
    createdDate: tweet.created_at,
    author: tweet.user.screen_name,
    user: userId,
    twitterTweetId: tweet.id,
    tags: ['unassigned'],
    type: type // tweet or twitterLike
  };
}

function saveOneTweet(twitterItem) {
  var newItem = new Item(twitterItem);
  return newItem.save();
}

function saveTweetsToDb(user, objectOfArrays) {
  var formatLikeForUser = formatTwitterItem.bind(null, user.id, 'twiterLike');
  var formatTweetForUser = formatTwitterItem.bind(null, user.id, 'tweet');
  var tweets = objectOfArrays.likes.map(formatLikeForUser).concat(objectOfArrays.timeline.map(formatTweetForUser));

  return Promise.all(tweets.map(saveOneTweet));
}

module.exports.importTwitterItems = function(user, options, done) {
  fetchRelevantTwitterItems(user, options)
    .then(function(objectOfArrays) {
      updateUserIds(user, options, objectOfArrays);
      return objectOfArrays;
    })
    .then(function(objectOfArrays) {
      return saveTweetsToDb(user, objectOfArrays);
    })
    .then(function(items){
      return done(null, items);
    })
    .then(null, function(err) {
      return done(err);
    });
};
