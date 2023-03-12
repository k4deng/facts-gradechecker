// Node Imports
const path = require("path");

// Config
const config = require("../config.js");

// API
const factsapi = require("../modules/factsapi.js");

// database
const { database } = require("../modules/enmap.js");

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
  router.get("/class/:classID", (req, res) => {

    factsapi.getClassGradesPage(req.params.classID)
      .then(classGrades => {
        
        // success
        if (classGrades.status == 1) {
          res.render(
            path.resolve(`${process.cwd()}/views/classGrades.ejs`), {
              gradesHTML: classGrades.result
            });
        }

        // error
        if (classGrades.status == 2) res.render(
          path.resolve(`${process.cwd()}/views/logs.ejs`), {
            title: "Error",
            logs: classGrades.result
          });
        
      });

  });

    // show class grade in json
    router.get("/class/:classID/json", (req, res) => {

      factsapi.getClassGradesData(req.params.classID)
        .then(data => {
          
          // success
          if (data.status == 1) {
            res.json(data.result);
          }
  
          // error
          if (data.status == 2) res.render(
            path.resolve(`${process.cwd()}/views/logs.ejs`), {
              title: "Error",
              logs: data.result
            });
          
        });
  
    });

  // grades overview
  router.get("/overview", (req, res) => {

    factsapi.getAllClassGradesInfo()
    .then(info => {
      
      // success
      if (info.status == 1) {
        res.render(
          path.resolve(`${process.cwd()}/views/overview.ejs`), {
            config: config,
            data: info.result
          });
      }

      // error
      if (info.status == 2) res.render(
        path.resolve(`${process.cwd()}/views/logs.ejs`), {
          title: "Error",
          logs: info.result
        });
      
    });

  });

  // updates
  router.get("/update", (req, res) => {

    updater.updateAll()
    .then(info => {
      
      res.render(
        path.resolve(`${process.cwd()}/views/logs.ejs`), {
          title: "Updater",
          logs: `${info.status == 1 ? "Success" : "Fail"}`
        });
      
    });

  });

  // get database
  router.get("/database", (req, res) => {
    let data = {};

    for (const key of database.indexes) {
      data[key] = database.get(key);
    }
      
    res.json(data);
  });

  return router;
}