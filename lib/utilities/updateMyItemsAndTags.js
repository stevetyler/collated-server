//update my items with new categories and update tags with new category
function updateMyItemsAndTagsHandler(req, res) {
	console.log('update my items called');
	updateMyItemsAndTags().then(() => {
		res.send({items: []});
	})
	.catch(err => {
		console.log(err);
		res.status(401).end();
	});
}

function updateMyItemsAndTags() {
	const dataObj = {};

	return Tag.find({user: 'stevetyler_uk'}).then(tags => {
		Object.assign(dataObj, {tags: tags});
		const unassignedTagArr = tags.filter(tag => {
			return tag.name === 'unassigned';
		});
		Object.assign(dataObj, {unassignedId: unassignedTagArr[0]._id});
		makeCategoriesFromTags(tags);
	}).then(() => {
		return Category.find({user: 'stevetyler_uk'});
	}).then(categories => {
		Object.assign(dataObj, {categories: categories});
		return Item.find({user: 'stevetyler_uk'});
	}).then(items => {
		return updateItemsWithCategories(dataObj, items);
	}).then(() => {
		return Item.find({user: 'stevetyler_uk'});
	}).then(updatedItems => {
		console.log('4 update item tags', updatedItems.length);
		if (Array.isArray(updatedItems) && updatedItems.length > 0) {
			const itemsTagsPromiseArr = updatedItems.forEach(item => {
				if (item.category) {
					return updateItemTagsWithCategory(item);
				}
			});
			Promise.all(itemsTagsPromiseArr);
		}
	});
}
