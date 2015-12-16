var async = require('async');
var db = require('../../../database/database');
var logger = require('nlogger').logger(module);
//var ensureAuthenticated = require('../../middlewares/ensure-authenticated').ensureAuthenticated;
var passport = require('../../../passport/passport-authenticate');
var passwordGenerator = require('password-generator');

var User = db.model('User');
var Tag = db.model('Tag');
console.log("loading users file");
module.exports.autoroute = {
	get: {
		'/users' : getUser,
		'/users/authenticated': handleIsAuthenticatedRequest,
    '/users/:id' : getUserId
	},
	put: {
		'/users/:id': putUser
	},
  post: {
    '/users': postUser,
    '/users/logout': handleLogoutRequest
  }
};

function getUser(req, res) {
	console.log("getuser ");
  var operation = req.query.operation;
  var user, userId, loggedInUser;

  if (operation === 'login') { handleLoginRequest(req, res); }

  //else if (operation === 'authenticated') { handleIsAuthenticatedRequest(req, res); }

  else {
    User.find({}, function(err, users) {
      if (err) {
        return res.status(500).end();
      }
      return res.send({'users': users});
    });
  }
}

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
	console.log("handleIsAuthenticatedRequest");
	console.log(req.user);
  if (req.isAuthenticated()) {
    return res.send({ users:[req.user] });
  } else {
    return res.send({ users: [] } );
  }
}

function getUserId(req, res) {
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
}

function putUser(req, res) {
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
}

function postUser(req, res) {
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
}
