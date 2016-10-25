'use strict';
const mongoose = require('mongoose');
const tagSchema = require('../schemas/tag.js');
const Tag = mongoose.model('Tag', tagSchema);

function assignItemTags(titleText, id, type) {
  var text = titleText.toLowerCase();
	console.log('text', text);
	var tagQuery = (type === 'slack' ? {slackTeamId: id} : {user: id});

	return Tag.find(tagQuery).then(tags => {
		return tags.reduce((obj, tag) => {
			let tagname = tag.name.toLowerCase();

	    if (text.indexOf(tagname) !== -1) {
	      console.log('tag found', tag);
	      obj.tagIds.push(tag._id);
	    }
			if (tagname === 'unassigned') {
				obj.unassignedId.push(tag._id);
			}
			return obj;
	  }, {tagIds: [], unassignedId: []});
	}).then(tagsObj => {
		console.log('tags returned', tagsObj);
		if (tagsObj.tagIds.length > 0) {
			return tagsObj.tagIds;
		}
		return tagsObj.unassignedId;
	});
}

module.exports = assignItemTags;
