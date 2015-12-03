// var exports = module.exports = {};
var async = require('async');
var db = require('../../../database/database');
var logger = require('nlogger').logger(module);
var passport = require('../../../passport/passport-authenticate');
var passwordGenerator = require('password-generator');
var router = require('express').Router(); // Router middleware

var User = db.model('User');
var Tag = db.model('Tag');

// user get requests

router.get('/auth/twitter', passport.authenticate('twitter'), function(req, res) {
     logger.info('Redirecting to Twitter');
});

router.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/with-account', failureRedirect: '/'

}));


router.get('/', function(req, res) {
  var operation = req.query.operation;
  var user, userId, loggedInUser;

  if (operation === 'login') { handleLoginRequest(req, res); }

  else if (operation === 'authenticated') { handleIsAuthenticatedRequest(req, res); }

  else if (operation === 'logout') { handleLogoutRequest(req, res); }

  else {
    User.find({}, function(err, users) {
      if (err) {
        return res.status(500).end();
      }
      return res.send({'users': users});
    });
  }
});

router.get('/:id', function(req, res) {
  var userId = req.params.id;
  var loggedInUser = req.user;

  User.findOne({id: userId}, function(err, user) {
    if (err) {
      return res.status(500).end();
    }
    if (!user) {
      return res.status(404).end();
    }
    var emberUser = user.makeEmberUser(user, loggedInUser); // why 2 params?

    res.send({'user': emberUser});
  });
});

router.put('/:id', function(req, res) {
  User.update(
    {id: req.params.id},
    {$set: {tagColoursAvailable: req.body.user.tagColoursAvailable}},
    function(err) {
      if(err) {
        console.log(err);
        return res.status(401).end();
      }
      return res.send({});
    }
  );
});

router.post('/', function(req, res) {
  console.log('post log');
  if (req.body.user) {
    User.findOne({id: req.body.user.id}, function (err, user) {
      if (user) {
        // user already exists
        res.status(400).end();
      }
      else {
        User.createUser(req.body.user, function(err, user) {
          if (err) {
            return res.status(500).end();
          }
          req.logIn(user, function(err) {
            if (err) {
              return res.status(500).end();
            }
            var emberUser = user.makeEmberUser(null); // null because no loggedinuser
            return res.send({'user': emberUser});
          });
        });
      }
    });
  }
});



// function definitions

function handleLoginRequest(req, res) {
  // uses 'local' calback function created by new LocalStrategy
  passport.authenticate('local', function(err, user, info) {
    logger.info(user);
    if (err) {
      return res.status(500).end();
    }
    if (!user) {
      return res.status(404).end();
    }
    // req.logIn sets cookie
    req.logIn(user, function(err) {
      if (err) {
        return res.status(500).end();
      }
      return res.send({'users': [user]});
    });
  })(req, res);
}

function handleLogoutRequest(req, res) {
  logger.info('Logging Out');
  req.logout();
  return res.send({ users: [] });
}

function handleIsAuthenticatedRequest(req, res) {
  if (req.isAuthenticated()) {
    return res.send({ users:[req.user] });
  } else {
    return res.send({ users: [] } );
  }
}


module.exports = router;


