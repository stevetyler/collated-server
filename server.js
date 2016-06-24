var express = require('express');
var autoroute = require('express-autoroute');

var app = express();

// // load middleware first before router
require('./express-config')(app);

autoroute(app, {});

//error handling
app.use(function(err, req, res, next) {
  if (err) {
    throw err;
  }
  res.status(err.status || 500);
});

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});

module.exports = server;

// // var CronJob = require('cron').CronJob;
// // var job = new CronJob('*/1 * * * * ', function() {
// //   console.log('cron alert');
// //   }, function () {
// //     /* This function is executed when the job stops */
// //   },
// //   true /* Start the job right now */
// //   //timeZone /* Time zone of this job. */
// // );
