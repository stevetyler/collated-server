// Middleware calls
// http://expressjs.com/guide/using-middleware.html#middleware.application
//var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session');

const auth = require('./auth');
const passport = require('./passport/passport-authenticate');
const MongoStore = require('connect-mongostore')(session);
const mongoose = require('mongoose');

module.exports = function (app) {
	app.use(session({
		secret: auth.session.secret,
		resave: true,  // true forces session to be saved even when unmodified. Not needed for Mongo
		saveUninitialized: false, // true forces a new unmodified session to be saved to the store. Passport will always modify
		//store: new MongoStore({ mongooseConnection: mongoose.connection, auto_reconnect: true })
		store: new MongoStore({
			mongooseConnection: mongoose.connection,
			auto_reconnect: true
		}, function() {
			console.log('db connection open');
		})
	}));

	app.use(bodyParser.json({limit: '50mb'}));
	app.use(bodyParser.urlencoded({limit: '50mb', extended: true})); // parse application/x-www-form-urlencoded
	app.use(fileUpload());
	app.use(passport.initialize());
	app.use(passport.session());
};
