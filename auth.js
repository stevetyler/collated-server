
if(process.env.NODE_ENV === 'production') {
	console.log("Running In Production")
	module.exports = {
		'twitterAuth' : {
			'consumerKey': 'XyvBxHeu6CQp0WXyo8zMngtQn',
			'consumerSecret': 'Pq92CeMt3Cnx6SWrgOWG7Pk580eaHhZoDMCmdFOdPZwbqvfsF8',
			'callbackURL': 'http://collated.net/api/users/auth/twitter/callback'
		}
	};
} else {
	module.exports = {
		'twitterAuth' : {
			'consumerKey': 'LQeZCC9ekkkwJpJiXoIzJ0pbC',
			'consumerSecret': 'm9bITFxUC0g6ZtSZSW1GpV5I5I6hAMctKt7IUWD7WbJqKV7sja',
			'callbackURL': 'http://collated-dev.net/api/users/auth/twitter/callback'
		}
	};
}
