'use strict';

const BPromise = require('bluebird');
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
    return twitterObject;
  }).then(null, function(err) {
    console.log(err);
  });
}

function setRequestParams(latestId, oldestId, options, params) {
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
  let latestIdsObj;
  let oldestIdsObj;
  const profile = user.twitterProfile;

  if (options.getLatest === 'true') {
    latestIdsObj = Object.assign({},
      setUserIdsForLatest('likes', twitterObject.likes, profile.latestLikeId),
      setUserIdsForLatest('tweets', twitterObject.timeline, profile.latestTweetId)
    );
    //console.log('latestIds to set', latestIdsObj);
    return saveUserIds(user.id, latestIdsObj, twitterObject);
  }
  else if (options.getOldest === 'true') {
    oldestIdsObj = Object.assign({},
      setUserIdsForOldest('likes', twitterObject.likes),
      setUserIdsForOldest('tweets', twitterObject.timeline)
    );
    //console.log('oldestIds to set', oldestIdsObj);
    return saveUserIds(user.id, oldestIdsObj, twitterObject);
  }
}

function setUserIdsForLatest(type, arr, latestId) {
  const newIds = {};

  if (latestId) {
    if (!arr.length) {
      return {};
    }
    if (arr.length === 1 && arr[0].id === parseInt(latestId, 10)) {
      return {};
    }
    if (type === 'likes') {
      newIds.latestLikeId = arr[0].id;
    }
    if (type === 'tweets') {
      newIds.latestTweetId = arr[0].id;
    }
  }
  //console.log('setUserIdsForLatest', newId);
  return newIds;
}

function setUserIdsForOldest(type, arr) {
  const newIdsObj = {};
  //console.log('setOldest latestId', latestId);

  if (arr.length < 2) {
    return {};
  }
  else if (type === 'likes') {
    newIdsObj.latestLikeId = arr[0].id;
  }
  else if (type === 'tweets') {
    newIdsObj.latestTweetId = arr[0].id;
  }

  if (type === 'likes') {
    newIdsObj.oldestLikeId = arr[arr.length-1].id;
  }
  if (type === 'tweets') {
    newIdsObj.oldestTweetId = arr[arr.length-1].id;
  }
  console.log('setUserIdsForOldest', newIdsObj);
  return newIdsObj;
}

function saveUserIds(userId, idsObj, twitterObject) {
  return User.findOne({id: userId})
  .exec().then(function(user) {
    console.log('user ids to save', idsObj);
    if(!user) {
			return new Error('User Not Found');
		}
    if (Object.keys(idsObj).length !== 0) {
      Object.assign(user.twitterProfile, idsObj);
      //console.log('user saved', user);
      return user.save();
    }
  })
  .then(() => {
    return Object.keys(idsObj).length !== 0 ? twitterObject : {};
  })
  .catch(err => {
    console.log(err);
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

module.exports.importTwitterItems = function(user, options) {
  let unassignedTagId;

  return Tag.findOne({user: user.id, name: 'unassigned'})
  .then(tag => {
    if (tag) {
      unassignedTagId = tag._id;
    }
  })
  .then(() => {
    return fetchRelevantTwitterItems(user, options);
  })
  .then(function(twitterObj) {
    return updateUserIds(user, options, twitterObj);
  })
  // .then(function(objectOfArrays) {
  //   return removeDuplicateTweets(user, options, objectOfArrays);
  // })
  .then(function(obj) {
    //console.log('obj returned', obj);
    if (Object.keys(obj).length === 0) {
      return [];
    }
    return saveTweetsToDb(user, obj, unassignedTagId);
  });
};


// function autoTagItems(item) {
// };

// function removeDuplicateTweets(user, options, objectOfArrays) {
//   let arrayOfArrays = new Array(objectOfArrays.likes, objectOfArrays.timeline);
//   let latestIdsArr = new Array(user.twitterProfile.latestLikeId, user.twitterProfile.latestTweetId);
//   //let oldestIds = new Array(user.twitterProfile.oldestLikeId, user.twitterProfile.oldestTweetId);
//
//   if (options.getLatest === 'true') {
//     console.log('remove duplicates', arrayOfArrays);
//     arrayOfArrays.map((arr, i) => {
//       if (arr[arr.length-1].id == latestIdsArr[i]) {
//         arr.pop(); //remove from tweetsObj
//       }
//       return arr;
//     });
//   }
//   return {
//     likes: arrayOfArrays[0],
//     timeline: arrayOfArrays[1]
//   };
//   if (options.getOldest === 'true') {
//     arrayOfArrays.map((arr, i) => {
//       if (latestId) {
//         arr.splice(0,1); // remove duplicate max id at beginning
//       }
//       return arr;
//     });
//   }
// }
