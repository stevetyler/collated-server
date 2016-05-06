var autorouteJson = require('express-autoroute-json');

var db = require('../../../database/database');

module.exports.autoroute = autorouteJson({
  model: db.model('Plan'),
  find: {}
});
