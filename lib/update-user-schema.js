var db = connect('mongodb://localhost/collated');

var collections = db.getCollectionNames();
var users = db.users.find();

print(collections); // lists all collection including 'users'
print(users); // empty object

db.users.find({id: 'collated_app'}, function(users) {
  users.forEach(function(user) {
    if (!user.apiKeys) {
      user.apiKeys = {};
    }
    db.users.update({_id: user._id}, {
      apiKeys: {
        twitterAccessToken: user.twitterAccessToken,
      }
    });
    print('user updated');
  });
});
