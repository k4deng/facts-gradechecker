// Node Imports
const path = require("path");

// Config
const config = require("../config.js");

// API
const factsapi = require("../modules/factsapi/factsapi.js");
const { makeAuthRequest } = require("../modules/factsapi/reqhelper.js");

// database
const { database, authdb } = require("../modules/enmap.js");

// updater
const updater = require("../modules/updater.js");

// moment for times
const moment = require("moment");

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

  // homework grid 
  router.get("/homework", async (req, res) => {

    const ssInfo = await makeAuthRequest("https://nbsmobileapi.renweb.com/api/SchoolsAndStudents/v1?featureName=10");
    const defaultTerm =
        config.defaultTerm !== 0 //if config default term exists
          ? config.defaultTerm  //use it
          : ssInfo.defaultTermId; //else grab school default term
  
    const rawHWData = await makeAuthRequest(`https://nbsmobileapi.renweb.com/api/Homework/students/${ssInfo.defaultStudentId}/schoolYearId/${ssInfo.defaultYearId}/legacyTermId/${defaultTerm}`);
  
    let formattedHWData = {};
  
    const selectedDate = moment();
    //get the homework within the selected week range
    for (const timeRange of rawHWData.studentHomeworkDateRangeModels) {

      //skip if not current week
      const dateRangeStart = moment(timeRange.dateRangeStart);
      const dateRangeEnd = moment(timeRange.dateRangeEnd);
      if (!selectedDate.isBetween(dateRangeStart, dateRangeEnd)) continue;

      // sort hw by class
      const classIds = [...new Set(timeRange.notesDetails.map(item => item.classId))];
      classIds.sort((a, b) => a - b);

      const sortedData = {};
      for (const classId of classIds) {
        // Filter the notesDetails for the current class
        const classNotes = timeRange.notesDetails.filter(item => item.classId === classId);

        // Sort the classNotes by eventDate (day)
        classNotes.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

        // Store the sorted classNotes in the sortedData object
        sortedData[classId] = classNotes;
      }
      formattedHWData = sortedData;

    }

    // give json result if asked for
    if (req.query.json) return res.json(formattedHWData);

    // otherwise html
    res.render(path.resolve(`${process.cwd()}/views/homework.ejs`), {
      moment: moment,
      hwData: formattedHWData
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