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
  var userFavsPromise;
  var userTimelinePromise;
  var tweetArr = [];


  var updatedParams = setRequestParams(user, options, params);

  userFavsPromise = client.get('favorites/list', params);
  userTimelinePromise = client.get('statuses/user_timeline', params);

  BPromise.join(userFavsPromise, userTimelinePromise, function(favs, timeline) {
    var tweets = favs.data.concat(timeline.data).sort(function(a,b) {return b-a;});

    console.log('favs received', favs.data.length, 'tweets received', timeline.data.length);
    //return done(null, []);
    // if (options.getLatestLikes === 'true') {
    //   setUserLatestTweetIds(user, tweets, done);
    // }
    // if (options.getPreviousLikes === 'true') {
    //   setUserPreviousTweetIds(user, tweets, done);
    // }
    // saveAllTweetsAndUpdateUser(user, tweets, tweetArr, done);
  }).then(null, function(err) {
    console.log(err);
    return done(err);
  });
}
/*if (user.twitterProfile.newestTweetId) {
  newestTweetId = user.twitterProfile.newestTweetId;
}
if (user.twitterProfile.oldestTweetId) {
  oldestTweetId = user.twitterProfile.oldestTweetId;
}*/

// import favs for either loggedin user manually or for all twitter users via cron job
module.exports.importTwitterItems = function(user, options, done) {

  var newestTweetId = null;
  var oldestTweetId = null;

  // fetch relevant tweets -> [ [Item Tweet], [Item Favorite] ]
  fetchRelevantTweets(user, options)
    .then(function(arrayOfArrays) {
      updateUserTweetIds()
      return mergedArray(arrayOfArrays)
    })
    .then(function(items) {
      saveToDb(items)
      return items
    })
    .then(done)

  // update timeline window on user profile
  // save to DB
  // pass [Item] to done()

  
};

function paramsForLatestLikes(opt) {
  return (opt === 'true') ?
    {
      since_id: user.twitterProfile.newestTweetId,
      count: 200
    } :
    {}
}

function paramsForPreviousLikes(opt) {

}

function setRequestParams(user, options, params) {
  return Object.assign({},
    params,
    paramsForLatestLikes(options.getLatestLikes),
    paramsForPreviousLikes()
  )


  if (options.getPreviousLikes === 'true') {
    if (user.twitterProfile.oldestTweetId) {
      params.max_id = user.twitterProfile.oldestTweetId;
      params.count = options.amount;
    }
    if (user.twitterProfile.newestTweetId) {
      params.max_id = user.twitterProfile.oldestTweetId;
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
  if (user.twitterProfile.newestTweetId) {
    if (!tweets.length) {
      return done(null, []);
    }
    if (tweets.length === 1 && tweets[0].id === parseInt(newestTweetId, 10)) {
      return done(null, []);
    }
    if (tweets[tweets.length-1].id == user.twitterProfile.newestTweetId) {
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
    user.twitterProfile.newestTweetId = newestTweetId;
    user.twitterProfile.oldestTweetId = oldestTweetId;
    return user.save();
  }).then(function() {
    return done(null, items);
  });
}
