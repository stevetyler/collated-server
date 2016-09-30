"use strict";

const BPromise = require('bluebird'); // Promise gives redefinition error
const Twit = require('twit');

const db = require('../database/database');
const configAuth = require('../auth');
const User = db.model('User');
const Item = db.model('Item');
const Tag = db.model('Tag');

function fetchRelevantTwitterItems(user, options) {
  const client = new Twit({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token: user.apiKeys.twitterAccessToken,
    access_token_secret: user.apiKeys.twitterSecretToken
  });
  const params = {
    screen_name: user.id,
  };
  const profile = user.twitterProfile;
  const likesParams = setRequestParams(profile.latestLikeId, profile.oldestLikeId, options, params);
  const tweetParams = setRequestParams(profile.latestTweetId, profile.oldestTweetId, options, params);

  const userLikesPromise = client.get('favorites/list', likesParams);
  const userTimelinePromise = client.get('statuses/user_timeline', tweetParams);

  return BPromise.join(userLikesPromise, userTimelinePromise, function(likes, timeline) {
    const twitterObject = {
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
    paramsForOldest(options.getOldest, oldestId, options.amount)
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

function paramsForOldest(opt, oldestId, amount) {
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
  let latestIds;
  let oldestIds;
  const profile = user.twitterProfile;

  if (options.getLatest === 'true') {
    // console.log('getLatest called');
    latestIds = Object.assign({},
      setUserIdsForLatest('likes', twitterObject.likes, profile.latestLikeId),
      setUserIdsForLatest('tweets', twitterObject.timeline, profile.latestTweetId)
    );
    console.log('latestIds to set', latestIds);
    return saveUserIds(user.id, latestIds);
  }
  else if (options.getOldest === 'true') {
    // console.log('getOldest called');
    oldestIds = Object.assign({},
      setUserIdsForOldest('likes', twitterObject.likes, profile.latestLikeId),
      setUserIdsForOldest('tweets', twitterObject.timeline, profile.latestTweetId)
    );
    console.log('oldestIds to set', oldestIds);
    return saveUserIds(user.id, oldestIds);
  }
}

function setUserIdsForLatest(type, arr, latestId) {
  const newId = {};

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

function setUserIdsForOldest(type, arr, latestId) {
  const newIds = {};
  //console.log('setOldest latestId', latestId);

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
  //console.log('setUserIdsForOldest', newIds);
  return newIds;
}

function saveUserIds(userId, ids) {
  return User.findOne({id: userId})
  .exec().then(function(user) {
    console.log('user to save ids', ids);
    if(!user) {
			return new Error('User Not Found');
		}
    Object.assign(user.twitterProfile, ids);

    console.log('user saved', user);
    return user.save();
  });
}

function formatTwitterItem(userId, type, unassignedTagId, tweet) {
  return {
    body: tweet.text,
    createdDate: tweet.created_at,
    author: tweet.user.screen_name,
    user: userId,
    twitterTweetId: tweet.id,
    tags: unassignedTagId,
    type: type // tweet or twitterLike
  };
}

function saveOneTweet(twitterItem) {
  const newItem = new Item(twitterItem);
  return newItem.save();
}

function saveTweetsToDb(user, objectOfArrays, unassignedTagId) {
  const formatLikeForUser = formatTwitterItem.bind(null, user.id, 'twitterLike', unassignedTagId);
  const formatTweetForUser = formatTwitterItem.bind(null, user.id, 'tweet', unassignedTagId);
  const tweets = objectOfArrays.likes.map(formatLikeForUser).concat(objectOfArrays.timeline.map(formatTweetForUser));

  return Promise.all(tweets.map(saveOneTweet));
}

// function autoTagItems(item) {
// };

module.exports.importTwitterItems = function(user, options, done) {
  let unassignedTagId;

  Tag.findOne({user: user.id, name: 'unassigned'})
  .then(tag => {
    if (tag) {
      unassignedTagId = tag._id;
    }
  })
  .then(() => {
    return fetchRelevantTwitterItems(user, options);
  })
  .then(function(objectOfArrays) {
    updateUserIds(user, options, objectOfArrays);
    return objectOfArrays;
  })
  .then(function(objectOfArrays) {
    return saveTweetsToDb(user, objectOfArrays, unassignedTagId);
  })
  .then(function(items){
    return done(null, items);
  })
  .then(null, function(err) {
    return done(err);
  });
};
