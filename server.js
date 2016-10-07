var express = require('express');
var autoroute = require('express-autoroute');
var paginate = require('express-paginate');

var app = express();

// // load middleware first before router
require('./express-config')(app);

// load before routes that will use pagination
app.use(paginate.middleware(15, 30));
autoroute(app, {});

//error handling
app.use(function(err, req, res) {
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
