module.exports = function(app) {
    app.use('/api/users', require('./routes/user/user-routes'));
    app.use('/api/favs', require('./routes/fav/fav-routes'));
};