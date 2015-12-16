var db = require('./database/database');
var express = require('express');
var autoroute = require('express-autoroute');
var app = express();
//
// // var CronJob = require('cron').CronJob;
// // var job = new CronJob('*/1 * * * * ', function() {
// //   console.log('cron alert');
// //   }, function () {
// //     /* This function is executed when the job stops */
// //   },
// //   true /* Start the job right now */
// //   //timeZone /* Time zone of this job. */
// // );
//
//
// // load middleware first before router
require('./express-config')(app);

// app.get('/', function(req, res){
//   // req.session.myNumber = req.session.myNumber ? req.session.myNumber++ : 1;
//   if(!req.session.myNumber) {
//     req.session.myNumber = 1;
//   } else {
//     req.session.myNumber++;
//   }
//   res.send('hello ' + req.session.myNumber);
// })

autoroute(app, {});
//
// // error handling
app.use(function(err, req, res, next) {
    if (err) throw err;
    res.status(err.status || 500);
});
//
// http://blog.mongolab.com/2013/11/deep-dive-into-connection-pooling/
// waiting for 'open' event from mongoose.connection
db.once('open', function() {
	var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
	});
});
