'use strict';
const bodyParser = require('body-parser');

const mailchimp = require('../../../lib/mailchimp');
const mailchimpListID = '2867adef0d';

const db = require('../../../database/database');
const User = db.model('User');

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
    //'/users': postUser,
    '/users/logout': handleLogoutRequest
  }
};

function getUser(req, res) {
  const userId = req.params.id;
  //const loggedInUser = req.user;
	let emberUser;
	//console.log('get user called', userId);
	return User.findOne({id: userId})
	.exec().then(function(user) {
		//console.log('get user found', user);
		if (!user) {
      return res.status(404).end();
    }
		try {
			emberUser = user.makeEmberUser();
		}
    catch (err) {
			console.log('make emberuser error', err);
		}
    res.send({'user': emberUser});
	})
	.then(null, function(){
		return res.status(500).end();
	});
}

function putUser(req, res) {
	const query = req.user.id;

	if (req.user.id === req.params.id) {
		User.findOne({id: query})
		.exec().then(function(user) {
			const newObj = {
				autoImport: req.body.user.twitterProfile.autoImport
			};
			Object.assign(user.twitterProfile, newObj);
			return user.save();
		})
		.then(function(user) {
			const emberUser = user.makeEmberUser();
			return res.send({'user': emberUser});
		});
	}
	else {
		return res.status(401).end();
	}
}

function updateUser(req, res) {
	const id = req.body.id;
	const name = req.body.name;
	const nameArr = name.split(' ');
	const email = req.body.email;
	const subscribe = req.body.subscribe;

	User.findOne({_id: req.user._id}).exec().then(function(user) {
		if(!user) {
			return new Error('User Not Found');
		}
		if (!user.id && id) {
			user.id = id;
		}
		if (name) {
			user.name = name;
		}
		if (email) {
			user.email = email;
		}
		return user.save();
	})
	.then(function(user){
		if(subscribe === 'true'){
			const fname = nameArr[0];
			nameArr.splice(0,1);
			const lname = nameArr.concat().join(' ');

			mailchimp(email, mailchimpListID, fname, lname).then( function() {
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

function checkIdExists(req, res) {
	const queryId = req.query.id;

	return User.find({id: queryId}).exec().then(function(user) {
		if (!queryId) {
			return res.send( {'users': []} );
		}
		if (!user.length) {
			return res.send( {'users': []} );
		}
		if (user.length) {
			return res.send( {'users': user} );
		}
	}).then(null, function() {
		res.status(401).send();
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

// function postUser(req, res) {
//   console.log('post log');
//   if (req.body.user) {
//     User.findOne({id: req.body.user.id}).then(function(user) {
//       if (user) {
//         return res.status(400).end();
//       }
//       else {
//         User.createUser(req.body.user, function(err, user) {
//           if (err) {
//             return res.status(500).end();
//           }
//           req.logIn(user, function(err) {
//             if (err) {
//               return res.status(500).end();
//             }
//             const emberUser = user.makeEmberUser(null); // null because no loggedinuser
//             return res.send({'user': emberUser});
//           });
//         });
//       }
//     });
//   }
// 	else {
// 		return res.status(401).end();
// 	}
// }

// Plans.findOne({_id: user.plan}).exec().then(function(plan){
// 	const permissions;
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
