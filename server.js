var db = require('./database/database');
var express = require('express');

var app = express();
// var server = app.listen(3000, function() {
//   console.log('Listening on port %d', server.address().port);
// });



// load middleware first before router
// var myFunc = require('./express-config');
// myFunc(app);
require('./express-config')(app);

require('./router')(app);


// error handling
app.use(function(err, req, res, next) {
    if (err) throw err;
    res.status(err.status || 500);
});

// ?? ask Vlad
// http://blog.mongolab.com/2013/11/deep-dive-into-connection-pooling/
// waiting for 'open' event from mongoose.connection
db.once('open', function() {
	var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
	});
});