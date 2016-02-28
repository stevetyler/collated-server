var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tagSchema = new Schema({
  id: String,
  colour: String,
  user: String,
  itemCount: String,
  isPrivate: String
});

// not in use
tagSchema.methods.makeEmberTag = function(tag, user) {
	var emberTag = {
		id: this.id,
		colour: this.colour,
		user: this.user.id,
    itemCount: this.itemCount
	};
};

tagSchema.statics.createTag = function(tag, done) {
	var Tag = this.model('Tag');

	Tag.create(tag, function(err, tag) {
		done(err, tag);
	});
};

module.exports = tagSchema;
