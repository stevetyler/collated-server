var db = require('../database/database');
var async = require('async');
var Twitter = require('twitter');
var configAuth = require('../auth');

var User = db.model('User');
var Item = db.model('Item');


// import favs for either loggedin user manually or for all twitter users via cron job
// async operation, must provide callback
module.exports.importItems = function(user, done) {

  var client = new Twitter({
    consumer_key: configAuth.twitterAuth.consumerKey,
    consumer_secret: configAuth.twitterAuth.consumerSecret,
    access_token_key: user.twitterAccessToken,
    access_token_secret: user.twitterSecretToken
  });
  var params = {
    screen_name: user.id,
    count: 1,
    //since_id: user.twitterLastTweetId
  };
  //var firstId = user.twitterFirstTweetId;


  if (user.twitterLastTweetId ) {
    params.max_id = user.twitterLastTweetId;
  }

  console.log('max id', params.max_id);

  client.get('favorites/list', params, function(error, tweets, response) {
    var tweetArr = [];
    
    if (error) {
      console.log(error);
      return done(error);
    }

    //if (tweets.length === 0 || tweets[0].id == user.twitterLastTweetId) {
    if (tweets.length === 0) {
      return done(null, []); // must return array of Mongo objects
    }

    var lastTweetId = tweets[tweets.length-1].id;

    console.log('tweets array', tweets);
    console.log('firstTweet', tweets[0].id);
    console.log('lastTweetId', lastTweetId);

    tweets.forEach(function(tweet) {
      twitterItem = {
        body: tweet.text,
        createdDate: tweet.created_at,
        author: tweet.user.screen_name,
        user: user.id,
        twitterTweetId: tweet.id, // loop through tweets
        tags: ['Undefined']
      };
      // console.log(tweet.id);
      tweetArr.push(twitterItem);
    });

    console.log('end');
    // call create function of fav model to create favs
    // eg check connection.model('fav')
    // forEach is sync, .save is async, create is sync
    // cannot use create because it doesn't return favs, use async module
    
    // array of Mongo fav objects
    var items = [];

    function saveOneTweet(twitterItem, done) {
      var newItem = new Item(twitterItem);
      newItem.save(function(err, item) {
        if (err) {
          return done(err);
        }
        else {
          items.push(item);
          return done(null); // signals end of save
        }
      });
    }

    // update lastTweetId on user model and return tweets
    async.each(tweetArr, saveOneTweet, function(err) {
      if (err) {
        return done(err);
      }
      else {
        User.findOneAndUpdate({id: user.id}, {
          twitterLastTweetId: lastTweetId 
          //twitterFirstTweetId: firstId
        }, function(err) {
          if (err) {
            return done(err);
          }
          else {
            return done(null, items);
          }
        });
      }
    });
  });
};


