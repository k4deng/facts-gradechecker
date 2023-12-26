// Node Imports
const path = require("path");

// Config
const config = require("./config.js");

// express
const express = require("express");
const app = express();
const port = config.appPort;

// For logging
const logger = require("./modules/logger.js");
const chalk = require("chalk");
const morgan = require("morgan");
morgan.token("statusColor", (req, res) => {
  // get the status code if response written
  const status = (typeof res.headersSent !== "boolean"
    ? Boolean(res.header)
    : res.headersSent)
    ? res.statusCode
    : undefined;
  // get status color
  const color =
    status >= 500
      ? 31 // red
      : status >= 400
        ? 33 // yellow
        : status >= 300
          ? 36 // cyan
          : status >= 200
            ? 32 // green
            : 0; // no color
  return "\x1b[" + color + "m" + status + "\x1b[0m";
});
morgan.token(
  "morgan-output",
  `${chalk.bgBlue(":method")} :url ${chalk.blue(
    "=>"
  )} :response-time ms ${chalk.blue("=>")}  :statusColor`
);

// actually use logger
app.use(morgan("morgan-output"));

// allow the static items to be accessed
app.use("/assets", express.static(path.resolve(`${process.cwd()}/assets`), { maxAge: "10d" }));

// site.com/
app.use("/", require("./routes/site")());

// site.com/fullReport
//app.use("/fullReport/", require("./routes/fullReport")());

app.listen(port, "0.0.0.0", () => {
  logger.log(`Listening on port ${port}`, "ready");
});
app.on("error", err => {
  logger.error(`Error with starting: ${err.code}`);
  return process.exit(0);
});