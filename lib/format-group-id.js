'use strict';
function formatGroupId(name) {
	// group ids must be capitalized
  let isCapitalized = name.charAt(0) === name.charAt(0).toUpperCase();

	if (!isCapitalized) {
		let nameArr = name.split(' ').map(str => {
      return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
		});
    return nameArr.join('-');
	}
	return name.split(' ').join('-');
}

module.exports = formatGroupId;
