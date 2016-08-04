var async = require('async');
var BPromise = require('bluebird'); // Promise gives redefinition error
var Twitter = require('twit');

var db = require('../database/database');
var configAuth = require('../auth');
var User = db.model('User');
var Item = db.model('Item');

function getRequestParams(latestId, oldestId, options, params) {
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
  var userFavsPromise;
  var userTimelinePromise;
  //var tweetArr = [];

  var profile = user.twitterProfile;
  var likesParams = getRequestParams(profile.latestLikeId, profile.oldestlikeId, options, params);
  var tweetParams = getRequestParams(profile.latestTweetId, profile.oldestTweetId, options, params);

  userFavsPromise = client.get('favorites/list', likesParams);
  userTimelinePromise = client.get('statuses/user_timeline', tweetParams);

  BPromise.join(userFavsPromise, userTimelinePromise, function(favs, timeline) {
    var tweetsReceived = [];

    tweetsReceived.push(favs.data, timeline.data);
    //console.log('favs received', favs.data.length, 'tweets received', timeline.data.length);
    return tweetsReceived;
  }).then(null, function(err) {
    console.log(err);
    //return done(err);
  });
};

// import favs for either loggedin user manually or for all twitter users via cron job
module.exports.importTwitterItems = function(user, options, done) {

  var latestTweetId = null;
  var oldestTweetId = null;


  if (user.twitterProfile.latestTweetId) {
    latestTweetId = user.twitterProfile.latestTweetId;
  }
  if (user.twitterProfile.oldestTweetId) {
    oldestTweetId = user.twitterProfile.oldestTweetId;
  }

  // fetch relevant tweets -> [ [Item Tweet], [Item Favorite] ]
  fetchRelevantTweets(user, options)
    .then(function(arrayOfArrays) {
      updateUserTweetIds();


      return mergedArray(arrayOfArrays);
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





function setUserPreviousTweetIds(user, tweets, done) {
  if (tweets.length < 2) {
    return done(null, []);
  }
  if (latestTweetId) {
    tweets.splice(0,1); // remove duplicate max id at beginning
  }
  else {
    latestTweetId = tweets[0].id;
  }
  oldestTweetId = tweets[tweets.length-1].id;
}

function setUserLatestTweetIds(user, tweets, done) {
  if (user.twitterProfile.latestTweetId) {
    if (!tweets.length) {
      return done(null, []);
    }
    if (tweets.length === 1 && tweets[0].id === parseInt(latestTweetId, 10)) {
      return done(null, []);
    }
    if (tweets[tweets.length-1].id == user.twitterProfile.latestTweetId) {
      tweets.pop();
    }
    latestTweetId = tweets[0].id;
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
      tags: ['undefined'],
      type: 'twitter'
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
    user.twitterProfile.latestTweetId = latestTweetId;
    user.twitterProfile.oldestTweetId = oldestTweetId;
    return user.save();
  }).then(function() {
    return done(null, items);
  });
}
