
if(process.env.NODE_ENV === 'production') {
	console.log("Running In Production");
	module.exports = {
		'twitterAuth' : {
			'consumerKey': 'XyvBxHeu6CQp0WXyo8zMngtQn',
			'consumerSecret': 'Pq92CeMt3Cnx6SWrgOWG7Pk580eaHhZoDMCmdFOdPZwbqvfsF8',
			'callbackURL': 'https://www.collated.net/api/users/auth/twitter/callback'
		},
		'facebookAuth' : {
			'clientID': '1721418721405997',
    	'clientSecret': 'e781661208f5ea1ed2cc34dd082827b8',
    	'callbackURL': 'https://www.collated.net/api/users/auth/facebook/callback'
		}
	};
} else {
	module.exports = {
		'twitterAuth' : {
			'consumerKey': 'LQeZCC9ekkkwJpJiXoIzJ0pbC',
			'consumerSecret': 'm9bITFxUC0g6ZtSZSW1GpV5I5I6hAMctKt7IUWD7WbJqKV7sja',
			'callbackURL': 'http://www.collated-dev.net/api/users/auth/twitter/callback'
		},
		'stripeAuth' : {
			'testSecretKey': 'sk_test_izGkB2GmYEIiHPxDbP6pU0Cp',
			'testPublishableKey': 'pk_test_DDjpbO1sCt8tREcXLZ8y9z3O'
		},
		'facebookAuth' : {
			'clientID': '701467179956411',
    	'clientSecret': 'ea827fe75118ba12e6789577f32c9576',
    	'callbackURL': 'http://www.collated-dev.net/api/users/auth/facebook/callback'
		}
	};
}
