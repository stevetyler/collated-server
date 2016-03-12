var configAuth = require('./../../../auth');
var stripe = require('stripe')(configAuth.stripeAuth.testSecretKey);

module.exports.autoroute = {
	get: {
		'/stripePlans/:id': getStripePlans,
	}
};

function getStripePlans(req, res) {
  stripe.plans.retrieve(req.params.id, function(err, plan) {
    if (err) {
      console.log(err);
      return res.status(401).end();
    }
    else {
      return res.send({'plans': plan});
    }
  });
}
