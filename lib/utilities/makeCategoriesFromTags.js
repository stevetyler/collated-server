function makeCategoriesFromTags(tags) {
	console.log('makeCategories called');
	const categoryTagsArr = tags.filter(tag => {
		return tag.colour !== 'cp-colour-1';
	});
	const categoryPromiseArr = categoryTagsArr.map(tag => {
		return Category.create({
			colour: tag.colour,
			isPrivate: tag.isPrivate,
			name: tag.name,
			user: tag.user
		});
	});

	return Promise.all(categoryPromiseArr);
}
