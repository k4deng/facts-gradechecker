const Enmap = require("enmap");

module.exports = {
  database: new Enmap({
    name: "database",
  }),
  authdb: new Enmap({
    name: "authdb",
  })
};