module.exports = function(app) {
    app.use('/api/users', require('./routes/user/user-routes'));
    app.use('/api/items', require('./routes/item/item-routes'));
    // app.use('/api/tags', require('./routes/tag/tag-routes'));
};