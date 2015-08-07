var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tagSchema = new Schema({
  id: String,
  colour: String
});


tagSchema.statics.createDefaultTags = function() {
	


};


module.exports = tagSchema;