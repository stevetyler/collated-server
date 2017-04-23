if(process.env.NODE_ENV === 'production') {
	console.log('Running In Production');
	module.exports = {
		'twitterAuth' : {
			'consumerKey': '',
			'consumerSecret': '',
			'callbackURL': 'https://www.collated.net/api/users/auth/twitter/callback'
		},
		'facebookAuth' : {
			'clientID': '',
    	'clientSecret': '',
    	'callbackURL': 'https://www.collated.net/api/users/auth/facebook/callback'
		},
		'mailchimpAuth' : {
			'client_id' : '',
			'client_secret' : ''
		},
		'mlabAuth' : {
			'user' : 'collated_admin',
			'password' : ''
		},
		'slackAuth' : {
			'clientID' : '',
			'clientSecret' : '',
			'callbackURL' : 'https://www.collated.net/api/users/auth/slack/callback'
		},
		'session' : {
			'secret' : ''
		}
	};
} else {
	module.exports = {
		'twitterAuth' : {
			'consumerKey': '',
			'consumerSecret': '',
			'callbackURL': 'http://www.collated-dev.net/api/users/auth/twitter/callback'
		},
		'stripeAuth' : {
			'testSecretKey': '',
			'testPublishableKey': ''
		},
		'facebookAuth' : {
			'clientID': '',
    	'clientSecret': '',
    	'callbackURL': 'http://www.collated-dev.net/api/users/auth/facebook/callback'
		},
		'mailchimpAuth' : {
			'apiKey' : '',
			'client_id' : '',
			'client_secret' : ''
		},
		'mlabAuth' : {
			'user' : 'collated_admin',
			'password' : ''
		},
		'slackAuth' : {
			'clientID' : '',
			'clientSecret' : '',
			'callbakcURL' : 'http://collated-dev.net/api/users/auth/slack/callback'
		},
		'session' : {
			'secret' : ''
		}
	};
}
