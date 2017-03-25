function updateItemsWithCategories(dataObj, items) {
	console.log('update item with categories', dataObj.categories, items.length);
	const filteredItems = items.filter(item => {
		return item.tags.indexOf(dataObj.unassignedId) === -1;
	});

	const itemsPromiseArr = filteredItems.map(item => {
		let categoryArr = [];
		const primaryTagId = item.tags[0];
		console.log('primaryTagId', primaryTagId, 'dataObj.tags', dataObj.tags.length);
		const primaryTagArr = dataObj.tags.filter(tag => {
			return tag._id == primaryTagId;
		});

		if (primaryTagArr.length) {
			console.log('primaryTag found', primaryTagArr, 'categories', dataObj.categories.length);
			categoryArr = dataObj.categories.filter(category => {
				console.log('category name to filter', category.name, primaryTagArr[0].name);
				return category.name === primaryTagArr[0].name;
			});
			console.log('category found', categoryArr);
		}

		if (categoryArr.length && categoryArr[0]) {
			const categoryId = categoryArr[0]._id;
			const newTags = item.tags;
			newTags.shift();
			console.log('new tags to apply to item', item);
			return Item.update({_id: item._id},
				{$set: {
					category: categoryId,
					tags: newTags
					}
				}
			);
		}
	});
	return Promise.all(itemsPromiseArr);
}
