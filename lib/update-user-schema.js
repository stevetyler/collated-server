var db = connect('127.0.0.1:27017/collated');


db.users.find({id: 'collated_app'}, function(user) {
  user.aggregate([
    {
      $group: {
        _id: '$twitterAccessToken',
        apiKeys : {
            $push: '$twitterAccessToken'
        }
      }
    },
    {
      $group: {
        _id: '$twitterSecretToken',
        apiKeys : {
            $push: '$twitterSecretToken'
        }
      }
    }
  ]);
});
