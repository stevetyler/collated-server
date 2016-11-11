var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tagSchema = new Schema({
  id: String,
  alias: String,
  category: String,
  colour: String,
  itemCount: String,
  isPrivate: String,
  isReserved: String,
  name: String,
  user: String,
  userGroup: String
});

tagSchema.methods.makeEmberTag = function(count) {
	var emberTag = {
		id: this._id,
    category: this.category,
		colour: this.colour,
    itemCount: count,
    isPrivate: this.isPrivate,
    name: this.name,
    user: this.user,
    userGroup: this.userGroup,
	};
  return emberTag;
};

module.exports = tagSchema;

// tagSchema.statics.createTag = function(tag, done) {
// 	var Tag = this.model('Tag');
//
// 	Tag.create(tag, function(err, tag) {
// 		done(err, tag);
// 	});
// };
