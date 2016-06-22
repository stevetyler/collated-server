var db = require('./database/database');
var express = require('express');
var morgan  = require('morgan');
var fs = require('fs');
var path = require('path');
var autoroute = require('express-autoroute');

var app = express();

// // var CronJob = require('cron').CronJob;
// // var job = new CronJob('*/1 * * * * ', function() {
// //   console.log('cron alert');
// //   }, function () {
// //     /* This function is executed when the job stops */
// //   },
// //   true /* Start the job right now */
// //   //timeZone /* Time zone of this job. */
// // );

// // load middleware first before router
require('./express-config')(app);

autoroute(app, {});

// create write stream in append mode
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'});

// setup logging
app.use(morgan('combined', {stream: accessLogStream}));


// error handling
app.use(function(err, req, res, next) {
    if (err) throw err;
    res.status(err.status || 500);
});

app.get('/', function(req, res) {
  res.send('logging');
});
// http://blog.mongolab.com/2013/11/deep-dive-into-connection-pooling/
// waiting for 'open' event from mongoose.connection

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});
// db.once('open', function() {});

module.exports = server;
