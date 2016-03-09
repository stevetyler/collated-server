var testKey = 'sk_test_izGkB2GmYEIiHPxDbP6pU0Cp';
var stripe = require('stripe')(testKey);

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
