// Middleware calls
// http://expressjs.com/guide/using-middleware.html#middleware.application
var auth = require('./auth');
var bodyParser = require('body-parser');
//var cookieParser = require('cookie-parser');
var passport = require('./passport/passport-authenticate');
//var parseurl = require('parseurl');
var session = require('express-session');
var MongoStore = require('connect-mongostore')(session);
const mongoose = require('mongoose');

module.exports = function (app) {
	app.use(session({
		secret: 'keyboard_cat_not_secure_s1ilxqSlduDgyUBl ',
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
	app.use(bodyParser.json());
	app.use(passport.initialize());
	app.use(passport.session());
};
