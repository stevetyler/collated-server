'use strict';
const mongoose = require('mongoose');

const categorySchema = require('../schemas/category.js');
const Category = mongoose.model('Category', categorySchema);
const tagSchema = require('../schemas/tag.js');
const Tag = mongoose.model('Tag', tagSchema);

function assignItemTags(titleText, groupId, userId) {
  const text = titleText.toLowerCase();
  const query = groupId ? {userGroup: groupId} : {user: userId};
  let categoryId;

  return Category.find(query).then(categories => {
    if (!groupId && Array.isArray(categories)) {
      return categories.forEach(category => {
        let categoryname = category.name.toLowerCase();

        if (text.indexOf(categoryname) !== -1) {
          categoryId = category._id;
        }
      });
    }
  }).then(() => {
    return Tag.find(query);
  }).then(tags => {
    if (Array.isArray(tags)) {
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
    }
	}).then(obj => {
		console.log('tags returned', obj);
		return obj.tagIds.length > 0 ? {
      categoryId: categoryId,
      tagIds: obj.tagIds,
		} : {
      categoryId: categoryId,
      tagIds: obj.unassignedId
    };
	});
}

module.exports = assignItemTags;
