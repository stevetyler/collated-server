//var db = connect('mongodb://localhost/collated');
var user = db.users.find({id: 'collated_app'});

// while (users.hasNext()) {
//    print(users.next().name);
// }


while (user.hasNext()) {
  if (!user.apiKeys) {
    user.apiKeys = {};
  }
  db.users.update({_id: user._id}, {
    apiKeys: {
      twitterAccessToken: user.twitterAccessToken,
    }
  });
  print(user, 'updated');
  user.next();
}
