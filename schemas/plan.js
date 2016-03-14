var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var planSchema = new Schema({
  name : String,
  period : String,
  stripePlan : String,
  features : [String]
});



module.exports = planSchema;
