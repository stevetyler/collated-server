
var passport = require('../../../../passport/passport-authenticate');

if(process.env.NODE_ENV === 'production') {
	module.exports.autoroute = {
		get: {
			'/facebook' : passport.authenticate('facebook'),
    	'/facebook/callback' : [
				passport.authenticate('facebook', {
					failureRedirect: '/'
				}),
				function(req, res) {
					console.log('req headers received', req.headers);
					try {
						if (req.headers.cookie.indexOf('ios=true') > -1) {
							res.redirect('net.collated.ios://');
						}
						else {
							res.redirect('https://app.collated.net/with-account');
						}
					}
					catch(err) {}
				}
			]
		}
	};
} else {
	module.exports.autoroute = {
		get: {
			'/facebook' : passport.authenticate('facebook'),
	    '/facebook/callback' : [
				passport.authenticate('facebook', {
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
