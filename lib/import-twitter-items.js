'use strict';
const BPromise = require('bluebird');
const Twit = require('twit');

const db = require('../database/database');
const configAuth = require('../auth');
//const assignItemTags = require('../lib/assign-item-tags.js');

const User = db.model('User');
const Item = db.model('Item');
//const Tag = db.model('Tag');

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
    console.log('received from twitter', twitterObject); // twitter errors give errors obj - catch
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
  const profile = user.twitterProfile;
  let latestIdsObj;
  let oldestIdsObj;

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
      setUserIdsForOldest('likes', twitterObject.likes, profile.latestLikeId),
      setUserIdsForOldest('tweets', twitterObject.timeline, profile.latestTweetId)
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
  console.log('setUserIdsForLatest', newIds);
  return newIds;
}

function setUserIdsForOldest(type, arr, latestId) {
  const newIdsObj = {};

  if (arr.length < 2) {
    return {};
  }
  else if (type === 'likes') {
    if (!latestId) {
      newIdsObj.latestLikeId = arr[0].id;
    }
    newIdsObj.oldestLikeId = arr[arr.length-1].id;
  }
  else if (type === 'tweets') {
    if (!latestId) {
      newIdsObj.latestTweetId = arr[0].id;
    }
    newIdsObj.oldestTweetId = arr[arr.length-1].id;
  }
  //console.log('setUserIdsForOldest', newIdsObj);
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

function formatTwitterItem(userId, type, tweet) {
  return {
    body: tweet.text,
    createdDate: tweet.created_at,
    author: tweet.user.screen_name,
    user: userId,
    twitterTweetId: tweet.id,
    //tags: unassignedTagId,
    type: type // tweet or twitterLike
  };
}

function saveTweetItem(twitterItem) {
  const textToSearch = twitterItem.body;
  //const userId = twitterItem.user;
  const options = {
    userId: twitterItem.user
  };

  return Item.assignCategoryAndTags(textToSearch, options)
  .then(idsObj => {
    console.log('tags found for tweet', idsObj);
    return Object.assign({}, twitterItem, {category: idsObj.category, tags: idsObj.tags});
  }).then((item) => {
    console.log('tweet item to be saved', item);
    const newItem = new Item(item);
    return newItem.save();
  });
}

function saveTweetsToDb(user, objectOfArrays) {
  const formatLikeForUser = formatTwitterItem.bind(null, user.id, 'twitterLike');
  const formatTweetForUser = formatTwitterItem.bind(null, user.id, 'tweet');
  const tweets = objectOfArrays.likes.map(formatLikeForUser).concat(objectOfArrays.timeline.map(formatTweetForUser));

  return Promise.all(tweets.map(saveTweetItem));
}

function removeDuplicateItems(user, options, objOfArrs) {
  // for latest remove last element, for oldest remove first
  // or create array of ids and remove from twitterObj ?
  const newObjOfArrs = {};
  const latestLikeId = user.twitterProfile.latestLikeId;
  const latestTweetId = user.twitterProfile.latestTweetId;
  const oldestLikeId = user.twitterProfile.oldestLikeId;
  const oldestTweetId = user.twitterProfile.oldestTweetId;
  //console.log('remove duplicates from', objOfArrs, options);

  if (options.getLatest === 'true') {
    if (objOfArrs.likes.length > 0) {
      if (objOfArrs.likes[objOfArrs.likes.length-1].id == latestLikeId) {
        //console.log('latest like removed');
        newObjOfArrs.likes = objOfArrs.likes.slice(0, -1);
      }
    }
    if (objOfArrs.timeline.length > 0) {
      if (objOfArrs.timeline[objOfArrs.timeline.length-1].id == latestTweetId) {
        newObjOfArrs.timeline = objOfArrs.timeline.slice(0, -1);
        //console.log('latest tweet removed');
      }
    }
  }
  if (options.getOldest === 'true') {
    if (objOfArrs.likes.length > 0) {
      if (objOfArrs.likes[0].id == oldestLikeId) {
        //console.log('likes returned', objOfArrs.likes.length);
        newObjOfArrs.likes = objOfArrs.likes.slice(1);
        //console.log('oldest like removed');
      }
    }
    if (objOfArrs.timeline.length > 0) {
      if (objOfArrs.timeline[0].id == oldestTweetId) {
        //console.log('tweets returned', objOfArrs.timeline.length);
        newObjOfArrs.timeline = objOfArrs.timeline.slice(1);
        //console.log('oldest tweet removed');
      }
    }
  }
  //console.log('newObjOfArrs', newObjOfArrs);
  return Object.assign(objOfArrs, newObjOfArrs);
}

module.exports = function(user, options) {

  return fetchRelevantTwitterItems(user, options)
  .then(function(objectOfArrays) {
    return removeDuplicateItems(user, options, objectOfArrays);
  })
  .then(function(twitterObj) {
    return updateUserIds(user, options, twitterObj);
  })
  .then(function(obj) {
    //console.log('obj returned', obj);
    if (Object.keys(obj).length === 0) {
      return [];
    }
    return saveTweetsToDb(user, obj);
  });
};
