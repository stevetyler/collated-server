
if(process.env.NODE_ENV === 'production') {
	console.log("Running In Production")
	module.exports = {
		'twitterAuth' : {
			'consumerKey': 'XyvBxHeu6CQp0WXyo8zMngtQn',
			'consumerSecret': 'Pq92CeMt3Cnx6SWrgOWG7Pk580eaHhZoDMCmdFOdPZwbqvfsF8',
			'callbackURL': 'http://www.collated.net/api/users/auth/twitter/callback'
		}
	};
} else {
	module.exports = {
		'twitterAuth' : {
			'consumerKey': 'LQeZCC9ekkkwJpJiXoIzJ0pbC',
			'consumerSecret': 'm9bITFxUC0g6ZtSZSW1GpV5I5I6hAMctKt7IUWD7WbJqKV7sja',
			'callbackURL': 'http://localhost:3000/api/users/auth/twitter/callback'
		}
	};
}
