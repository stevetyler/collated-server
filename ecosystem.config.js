module.exports = {
  apps : [{
    name        : "collated server",
    script      : "./server.js",
    watch       : true,
    env: {
      "NODE_ENV": "production",
    },
  },
  {
    name        : "lightning deploy",
    script      : "../express-lightning-deploy/app.js",
    watch       : true,
    env: {
      "NODE_ENV": "production"
    }
  }]
};
