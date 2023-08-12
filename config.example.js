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
  
  hiddenClasses: [ ] //array of class ids to hide from the program
};

module.exports = config;