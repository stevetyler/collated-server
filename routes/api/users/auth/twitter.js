'use strict';

let passport = require('../../../../passport/passport-authenticate');
//let isIos;

if (process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/twitter' : passport.authenticate('twitter'),
	    '/twitter/callback' : passport.authenticate('twitter', {
				successRedirect: 'https://app.collated.net/with-account',
				failureRedirect: '/'
			}),
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/twitter' : passport.authenticate('twitter'),
	    '/twitter/callback' : [
				//getQueryParam,
				passport.authenticate('twitter', {
					//successRedirect: isIos ? 'net.collated.ios://' : 'http://www.collated-dev.net/with-account', // isIos always false
					failureRedirect: '/'
				}),
				function(req, res) {
					console.log('query', req.query, 'req.user', req.user);
					//console.log('get isIos ', isIos);
					if (req.user.ios) {
						res.redirect('net.collated.ios://');
					}
					else {
						res.redirect('http://www.collated-dev.net/with-account');
					}
				}
			]
		}
	};
}


function getQueryParam(req, res, next) {
	console.log('get queryParam iOS ', req.query.ios);

	if (req.query.ios === 'true') {
		req.user.ios = true;
	}
	//console.log('get query iOS ', isIos);
	next();
}
