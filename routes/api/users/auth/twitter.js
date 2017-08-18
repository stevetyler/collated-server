'use strict';

const passport = require('../../../../passport/passport-authenticate');

if (process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/twitter' : passport.authenticate('twitter'),
	    '/twitter/callback' : [
				passport.authenticate('twitter', {
					failureRedirect: '/'
				}),
				function(req, res) {
					//console.log('req headers received', req.headers);
					try {
						if (req.headers.cookie.indexOf('ios=true') > -1) {
							let token = req.user.apiKeys.collatedToken;
							//console.log('net.collated.ios://' + token);
							res.redirect('net.collated.ios://' + token);
						}
						else {
							res.redirect('https://app.collated.net/with-account');
						}
					}
					catch(err) {}
				}
			],
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/twitter' : passport.authenticate('twitter'),
	    '/twitter/callback' : [
				passport.authenticate('twitter', {
					failureRedirect: '/'
				}),
				function(req, res) {
					//console.log('req user received', req.user);

					try {
						if (req.headers.cookie.indexOf('ios=true') > -1) {
							let token = req.user.apiKeys.collatedToken;
							//console.log('net.collated.ios://' + token);
							res.redirect('net.collated.ios://' + token);
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
