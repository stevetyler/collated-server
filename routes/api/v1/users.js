//var logger = require('nlogger').logger(module);
//var passwordGenerator = require('password-generator');
//var ensureAuthenticated = require('../../middlewares/ensure-authenticated').ensureAuthenticated;
var bodyParser = require('body-parser');

var mailchimp = require('../../../lib/mailchimp');
var mailchimpListID = '2867adef0d';

var db = require('../../../database/database');
var User = db.model('User');

module.exports.autoroute = {
	get: {
		'/users/authenticated': handleIsAuthenticatedRequest,
		'/users/checkIdExists': checkIdExists,
    '/users/:id' : getUser
	},
	put: {
		'/users/update': [bodyParser.urlencoded({extended: true}), bodyParser.json(), updateUser],
		'/users/:id' : putUser
	},
  post: {
    '/users': postUser,
    '/users/logout': handleLogoutRequest
  }
};

function checkIdExists(req, res) {
	var queryId = req.query.id;

	return User.find({id: queryId}, function(err, user) {
		if (err) {
			res.status(401).send();
		}
		else if (!queryId) {
			return res.send( {'users': []} );
		}
		else if (!user.length) {
			return res.send( {'users': []} );
		}
		else if (user.length) {
			return res.send( {'users': user} );
		}
	});
}

function handleLogoutRequest(req, res) {
  //logger.info('Logging Out');
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

function getUser(req, res) {
  var userId = req.params.id;
  //var loggedInUser = req.user;
	var emberUser;

  User.findOne({id: userId}, function(err, user) {
    if (err) {
      return res.status(500).end();
    }
    if (!user) {
      return res.status(404).end();
    }
    emberUser = user.makeEmberUser(); // pass in user?

    res.send({'user': emberUser});
  });
}

function putUser(req, res) {
	var query = req.user.id;

	if (req.user.id === req.params.id) {
		User.findOne({id: query}).exec().then(function(user) {
			user.twitterAutoImport = req.body.user.twitterAutoImport;
			return user.save();
		})
		.then(function(user) {
			return res.send({'users': [user]});
		});
	}
}

function updateUser(req, res) {
	var id = req.body.id;
	var name = req.body.name;
	var email = req.body.email;
	var subscribe = req.body.subscribe;

	User.findOne({_id: req.user._id}).exec().then(function(user) {
		if(!user) {
			return new Error('User Not Found');
		}
		user.id = id;
		user.name = name;
		user.email = email;
		return user.save();
	})
	.then(function(user){
		if(subscribe === 'true'){
			mailchimp(email, mailchimpListID).then( function() {
				console.log(`Successfully subscribed ${email} to ${mailchimpListID}`);
			}, function(err){
				console.error('Error subscribing user to mailchimp', err);
			});
		}
		return user;
	})
	.then(function(user) {
		return res.send({'users': [user]});
	})
	.then(null, function(err) {
		return res.status(401).send(err.message);
	});
}

function postUser(req, res) {
  console.log('post log');
  if (req.body.user) {
    User.findOne({id: req.body.user.id}, function (err, user) {
      if (user) {
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

// Plans.findOne({_id: user.plan}).exec().then(function(plan){
// 	var permissions;
// 	if(!plan){
// 		permissions = [];
// 	} else {
// 		permissions = plan.permission;
// 	}
// })

// function handleLoginRequest(req, res) {
//   passport.authenticate('local', function(err, user, info) {
//     logger.info(user);
//     if (err) {
//       return res.status(500).end();
//     }
//     if (!user) {
//       return res.status(404).end();
//     }
//     // req.logIn sets cookie
//     req.logIn(user, function(err) {
//       if (err) {
//         return res.status(500).end();
//       }
//       return res.send({'users': [user]});
//     });
//   })(req, res);
// }
