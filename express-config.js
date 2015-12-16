// Middleware calls
// http://expressjs.com/guide/using-middleware.html#middleware.application

var bodyParser = require('body-parser');
//var cookieParser = require('cookie-parser');
var passport = require('./passport/passport-authenticate');
var cors = require('cors');
var parseurl = require('parseurl');
var session = require('express-session');
var MongoStore = require('connect-mongostore')(session);

module.exports = function (app) {
	//app.use(cookieParser()); not needed since 1.5.0
	app.use(cors({
  origin: 'http://localhost:4200',
	credentials: true
}));

	app.use(session({
		secret: 'keyboard_cat_not_secure_s1ilxqSlduDgyUBl ', // what is this??
		// resave: false,  // true forces session to be saved even when unmodified
		// saveUninitialized: false,  // true forces a new unmodified session to be saved to the store.
		saveUninitialized: true,
		//httpOnly: false,
		//rolling: false,  // reset expiration date setting cookie on every response
		store: new MongoStore({'db': 'sessions'}) // persistent sessions
	}));

	app.use(bodyParser.json());

	app.use(passport.initialize());
	app.use(passport.session());
};
