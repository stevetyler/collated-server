var async = require('async');
var logger = require('nlogger').logger(module);
var passwordGenerator = require('password-generator');

var db = require('../../../database/database');
//var ensureAuthenticated = require('../../middlewares/ensure-authenticated').ensureAuthenticated;
var passport = require('../../../passport/passport-authenticate');

var User = db.model('User');
var Tag = db.model('Tag');
//console.log("loading users file");

module.exports.autoroute = {
	get: {
		'/users' : getUser,
		'/users/authenticated': handleIsAuthenticatedRequest,
    '/users/:id' : getUserId,
		'/users/checkId': checkIdIsAvailable // not working with Ember.ajax
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

	else if (operation === 'checkId') {
		checkIdIsAvailable(req, res);
	}

  else {
    User.find({}, function(err, users) {
      if (err) {
        return res.status(500).end();
      }
      return res.send({'users': users});
    });
  }
}

function checkIdIsAvailable(req, res) {
	console.log('req.query', req.query);
	var queryId = req.query.id;
	//console.log('query id', queryId);

	return User.find({id: queryId}, function(err, user) {
		if (err) {
			res.status(401).send();
		}
		else if (!user.length) {
			console.log(queryId, 'id not found');
			return res.status(401).send();
		}
		else if (user.length) {
			console.log(queryId, 'id found');
			return res.status(400).send();
		}
	});

	//return res.status(401).send();

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
	//console.log("handleIsAuthenticatedRequest");
	//console.log(req.user);
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

		// Plans.findOne({_id: user.plan}).exec().then(function(plan){
		// 	var permissions;
		// 	if(!plan){
		// 		permissions = [];
		// 	} else {
		// 		permissions = plan.permission;
		// 	}
		// })

    var emberUser = user.makeEmberUser(user, loggedInUser); // pass in permissions when needed

    res.send({'user': emberUser});
  });
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
