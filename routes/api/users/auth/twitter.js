'use strict';

const passport = require('../../../../passport/passport-authenticate');

if (process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		// get: {
		// 	'/twitter' : passport.authenticate('twitter'),
	  //   '/twitter/callback' : [
		// 		passport.authenticate('twitter', {
		// 			failureRedirect: '/'
		// 		}),
		// 		function(req, res) {
		// 			//console.log(req.cookies.ios);
		// 			if (req.cookies.ios) {
		// 				res.redirect('net.collated.ios://');
		// 			}
		// 			else {
		// 				res.redirect('https://app.collated.net/with-account');
		// 			}
		// 		}
		// 	],
		// }
	};
} else {
	module.exports.autoroute = {
		get: {
			'/twitter' : passport.authenticate('twitter'),
	    '/twitter/callback' : [
				//setStateParam,
				passport.authenticate('twitter', {
					failureRedirect: '/'
				}),
				function(req, res) {
					console.log('req headers received', req.headers);
					try {
						if (req.headers.cookie.indexOf('ios=true') > -1) {
							res.redirect('net.collated.ios://');
						}
						else {
							res.redirect('http://www.collated-dev.net/with-account');
						}
					}
					catch(err) {}
				}
			]
		}
	};
}

// function setStateParam(req, res, next) {
// 	if (req.query.ios) {
// 		Object.assign(express.request, {query : {ios : true}});
// 		//base64url(JSON.stringify({ios: 'true'}));
// 	}
// 	console.log('req query', req.query);
// 	next();
// }
