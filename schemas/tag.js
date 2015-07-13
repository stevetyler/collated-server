var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tagSchema = new Schema({
  id: String,
  user: String,
  name: String,
  colour: String  
});

module.exports = tagSchema;