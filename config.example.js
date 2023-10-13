const config = {
  devMode: false,
  debug: false,

  appPort: "8080",

  infoWebhookURL: "https://discord.com/api/webhooks/.../...",
  allDataWebhookURL: "https://discord.com/api/webhooks/.../...",

  districtCode: "CODE",
  username: "example@gmail.com",
  password: "supersecurepassword",

  defaultTerm: 0, //set to "0" to default to the default term from the school
  
  classList: [ ], //array of class ids; affected by chosen option below (leave empty for all classes shown)
  type: 0, //0 = whitelist, 1 = blacklist
};

module.exports = config;