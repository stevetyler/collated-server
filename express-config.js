// Middleware calls 
// http://expressjs.com/guide/using-middleware.html#middleware.application

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('./passport/passport-authenticate');
var MongoStore = require('connect-mongostore')(session);

module.exports = function (app) {
	app.use(cookieParser());
	app.use(bodyParser.json());
	app.use(session({
		secret: 'keyboard cat', // what is this??
		resave: true,  // forces session to be saved even when unmodified
		saveUninitialized: true,  // forces a new unmodified session to be saved to the store. 
		rolling: false,  // reset expiration date setting cookie on every response
		store: new MongoStore({'db': 'sessions'}) // persistent sessions
	}));
	app.use(passport.initialize());
	app.use(passport.session());
};