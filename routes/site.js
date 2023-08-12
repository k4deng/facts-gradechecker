// Node Imports
const path = require("path");

// Config
const config = require("../config.js");

// API
const factsapi = require("../modules/factsapi/factsapi.js");

// database
const { database, authdb } = require("../modules/enmap.js");

// updater
const updater = require("../modules/updater.js");

// Express Session
const express = require("express");
const router = express.Router();

module.exports = function() {
  
  // how to use
  router.get("/", (req, res) => {
    res.render(
      path.resolve(`${process.cwd()}/views/index.ejs`), {
        config: config
      });
  });

  // show class grade
  router.get("/class/:classID", async (req, res) => {

    const classGrades = await factsapi.getClassGradesPage(req.params.classID);

    // success
    if (classGrades.status == 1) res.render(
      path.resolve(`${process.cwd()}/views/classGrades.ejs`), {
        gradesHTML: classGrades.result
      });

    // error
    if (classGrades.status == 2) res.render(
      path.resolve(`${process.cwd()}/views/logs.ejs`), {
        title: "Error",
        logs: classGrades.result
      });
        
  });

  // show class grade in json
  router.get("/class/:classID/json", async (req, res) => {

    const data = await factsapi.getClassGradesData(req.params.classID);
        
    // success
    if (data.status == 1) res.json(data.result);

    // error
    if (data.status == 2) res.render(
      path.resolve(`${process.cwd()}/views/logs.ejs`), {
        title: "Error",
        logs: data.result
      });
          
  });

  // grades overview
  router.get("/overview", async (req, res) => {

    const info = await factsapi.getAllClassGradesInfo();
      
    // success
    if (info.status == 1) res.render(
      path.resolve(`${process.cwd()}/views/overview.ejs`), {
        config: config,
        data: info.result
      });

    // error
    if (info.status == 2) res.render(
      path.resolve(`${process.cwd()}/views/logs.ejs`), {
        title: "Error",
        logs: info.result
      });

  });

  // updates
  router.get("/update/:type", async (req, res) => {

    let func;
    if (req.params.type == "all") func = updater.updateAll;
    else if (req.params.type == "notifs") func = updater.sendNotif;
    else if (req.params.type == "info") func = updater.updateAllClassGradesInfo;
    else if (req.params.type == "data") func = updater.updateAllClassGradesData;
    else return res.sendStatus(404);

    const info = await func(); 
    res.render(
      path.resolve(`${process.cwd()}/views/logs.ejs`), {
        title: "Updater",
        logs: `${info.status == 1 ? "Success" : "Fail"}`
      });
      
  });

  // get database
  router.get("/database", (req, res) => {
    const data = { data: {}, authdb: {} };

    for (const key of database.indexes) {
      data.data[key] = database.get(key);
    }

    for (const key of authdb.indexes) {
      data.authdb[key] = authdb.get(key);
    }
      
    res.json(data);
  });

  return router;
};