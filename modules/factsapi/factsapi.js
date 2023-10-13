/* eslint-disable no-inner-declarations */

// config
const config = require("../../config.js");

// logger
const logger = require("../logger.js");

// auth & direct api functions
const { makeAuthRequest } = require("./reqhelper.js");

// get a classes grades (returns HTML)
async function getClassGradesPage(classID, term) {

  try {
    const ssInfo = await makeAuthRequest("https://nbsmobileapi.renweb.com/api/SchoolsAndStudents/v1?featureName=10");
    const defaultTerm = term 
      ? term //if term provided, use it
      : config.defaultTerm !== 0 //else if config default term exists
        ? config.defaultTerm  //use it
        : ssInfo.defaultTermId; //else grab school default term

    //get pwcode that is used to load webpages
    const pwcode = await makeAuthRequest("https://accounts.renweb.com/connect/userinfo").then(userinfo => userinfo.pwcode);

    //get class grades page
    const html = await makeAuthRequest(
      `https://${config.districtCode}.client.renweb.com/pwr/student/gradebook_ajax.cfm` +
      `?code=${pwcode}` +
      "&code_verifier=0N5uQFllFe07PUhTot4hn4oBaUNTN3nfwOUvc3Ln0X8" +
      "&iss=https://accounts.renweb.com" +
      `&studentid=${ssInfo.defaultStudentId}` +
      "&isAjaxRequest=gradespage" +
      `&classid=${classID}` +
      `&termid=${defaultTerm}`,
      { waitUntil: "domcontentloaded" }
    );

    //send off result
    return { status: 1, result: html };
  } catch (e) {
    //send error(s)
    logger.error("\"There was an unknown error fetching grades: " + e);
    return { status: 2, result: "There was an unknown error fetching grades!" };
  }

}

// get a classes grade information (returns JSON)
async function getClassGradesInfo(classID, term) {

  try {

    const ssInfo = await makeAuthRequest("https://nbsmobileapi.renweb.com/api/SchoolsAndStudents/v1?featureName=10");
    const defaultTerm = term 
      ? term //if term provided, use it
      : config.defaultTerm !== 0 //else if config default term exists
        ? config.defaultTerm  //use it
        : ssInfo.defaultTermId; //else grab school default term

    //load all classes info
    const data = await makeAuthRequest(`https://nbsmobileapi.renweb.com/api/StudentClasses/${ssInfo.defaultSchoolCode}/${ssInfo.defaultYearId}/${defaultTerm}/${ssInfo.defaultStudentId}`);
    
    //get class data for the one class
    const classData = data.find(x => x.classId == classID);

    //get term grade style
    const termGradeStyle =
      classData.gradebookAverage == "" //nothing
        ? "success"
        : classData.gradebookAverage >= 90 //A
          ? "success"
          : classData.gradebookAverage >= 80 //B
            ? "warning"
            : classData.gradebookAverage >= 70 //C
              ? "danger"
              : classData.gradebookAverage >= 60 //D
                ? "danger"
                : "outline-danger"; //F

    //display the object differently
    const info = {
      classId: classData.classId,
      termId: classData.termId,
      yearId: classData.yearId,
      academicYear: classData.academicYear,
      gbkGradeMethod: classData.gbkGradeMethod,
      class: {
        name: classData.className,
        abbreviation: classData.courseAbbreviation,
        title: classData.courseTitle,
        department: classData.department
      },
      teacher: {
        id: classData.staffId,
        firstName: classData.staffFirstName,
        lastName: classData.staffLastName
      },
      termGrade: {
        average: classData.gradebookAverage == "" ? "100" : classData.gradebookAverage,
        letter: classData.gradebookLetter == "" ? "A+" : classData.gradebookLetter,
        style: termGradeStyle
      },
      gradesDisabled: classData.gradesDisabled,
      categoryGradesDisabled: classData.categoryGradesDisabled,
      fullDetailsDisabled: classData.fullDetailsDisabled
    };

    //send off result
    return { status: 1, result: info };
  } catch (e) {
    //send error(s)
    logger.error(e);
    return { status: 2, result: "There was an unknown error fetching grades!" };
  }

}

// get all class grades information (returns JSON)
async function getAllClassGradesInfo(term) {

  try {
    const result = {};

    const ssInfo = await makeAuthRequest("https://nbsmobileapi.renweb.com/api/SchoolsAndStudents/v1?featureName=10");
    const defaultTerm = term 
      ? term //if term provided, use it
      : config.defaultTerm !== 0 //else if config default term exists
        ? config.defaultTerm  //use it
        : ssInfo.defaultTermId; //else grab school default term

    //load all classes info
    const data = await makeAuthRequest(`https://nbsmobileapi.renweb.com/api/StudentClasses/${ssInfo.defaultSchoolCode}/${ssInfo.defaultYearId}/${defaultTerm}/${ssInfo.defaultStudentId}`);

    //loop through classes
    for (const classData of data) {      

      //hide classes with grades disabled and check whitelist/blacklist
      if (classData.gradesDisabled == true) continue;
      if (config.classListType == 0 && config.classList[0] && !config.classList.includes(classData.classId)) continue;
      if (config.classListType == 1 && config.classList.includes(classData.classId)) continue;

      //get term grade style
      const termGradeStyle =
        classData.gradebookAverage == "" //nothing
          ? "success"
          : classData.gradebookAverage >= 90 //A
            ? "success"
            : classData.gradebookAverage >= 80 //B
              ? "warning"
              : classData.gradebookAverage >= 70 //C
                ? "danger"
                : classData.gradebookAverage >= 60 //D
                  ? "danger"
                  : "outline-danger"; //F

      //display the object differently
      result[classData.classId] = {
        classId: classData.classId,
        termId: classData.termId,
        yearId: classData.yearId,
        academicYear: classData.academicYear,
        gbkGradeMethod: classData.gbkGradeMethod,
        class: {
          name: classData.className,
          abbreviation: classData.courseAbbreviation,
          title: classData.courseTitle,
          department: classData.department
        },
        teacher: {
          id: classData.staffId,
          firstName: classData.staffFirstName,
          lastName: classData.staffLastName
        },
        termGrade: {
          average: classData.gradebookAverage == "" ? "100" : classData.gradebookAverage,
          letter: classData.gradebookLetter == "" ? "A+" : classData.gradebookLetter,
          style: termGradeStyle
        },
        gradesDisabled: classData.gradesDisabled,
        categoryGradesDisabled: classData.categoryGradesDisabled,
        fullDetailsDisabled: classData.fullDetailsDisabled
      };

    } //end loop

    //send off result
    return { status: 1, result: result };
  } catch (e) {
    //send error(s)
    logger.error(e);
    return { status: 2, result: "There was an unknown error fetching grades!" };
  }

}

// get all assignments & grades data (returns JSON)
async function getClassGradesData(classID, term) {

  try {

    const ssInfo = await makeAuthRequest("https://nbsmobileapi.renweb.com/api/SchoolsAndStudents/v1?featureName=10");
    const defaultTerm = term 
      ? term //if term provided, use it
      : config.defaultTerm !== 0 //else if config default term exists
        ? config.defaultTerm  //use it
        : ssInfo.defaultTermId; //else grab school default term

    //load class info
    const apidata = await makeAuthRequest(`https://nbsmobileapi.renweb.com/api/StudentClasses/v2/${ssInfo.defaultSchoolCode}/${ssInfo.defaultYearId}/${defaultTerm}/${ssInfo.defaultStudentId}/${classID}`);
           
    const data = {};
    for (const category of apidata.categories) {

      data[category.title] = {
        title: category.title,
        description: category.description,
        assignments: {}
      };

      for (const assignment of category.assignments) {
        
        data[category.title]["assignments"][assignment.title] = {
          title: assignment.title,
          notes: assignment.notes,
          grade: assignment.grade,
          date: {
            due: assignment.dateDue,
            assigned: assignment.dateAssigned
          },
          points: {
            received: assignment.pointsReceived,
            max: assignment.pointsMax,
            bonus: assignment.pointsBonus
          }
        }; 

      }

    }

    //send off result
    return { status: 1, result: data };
  } catch (e) {
    //send error(s)
    logger.error(e);
    return { status: 2, result: "There was an unknown error fetching grades!" };
  }

}

// get all assignments & grades data for all classes (returns JSON)
async function getAllClassGradesData(term) {

  try {
    const result = {};

    const ssInfo = await makeAuthRequest("https://nbsmobileapi.renweb.com/api/SchoolsAndStudents/v1?featureName=10");
    const defaultTerm = term 
      ? term //if term provided, use it
      : config.defaultTerm !== 0 //else if config default term exists
        ? config.defaultTerm  //use it
        : ssInfo.defaultTermId; //else grab school default term

    //load all classes info
    const classesInfo = await makeAuthRequest(`https://nbsmobileapi.renweb.com/api/StudentClasses/${ssInfo.defaultSchoolCode}/${ssInfo.defaultYearId}/${defaultTerm}/${ssInfo.defaultStudentId}`);

    //loop through classes
    for (const classInfo of classesInfo) {

      //class data grades info
      const classData = await makeAuthRequest(`https://nbsmobileapi.renweb.com/api/StudentClasses/v2/${ssInfo.defaultSchoolCode}/${ssInfo.defaultYearId}/${defaultTerm}/${ssInfo.defaultStudentId}/${classInfo.classId}`);
      
      //hide classes with grades disabled and check whitelist/blacklist
      if (classInfo.gradesDisabled == true) continue;
      if (config.classListType == 0 && !config.classList.includes(classInfo.classId)) continue;
      if (config.classListType == 1 && config.classList.includes(classInfo.classId)) continue;

      const data = {};
      for (const category of classData.categories) {

        data[category.title] = {
          title: category.title,
          description: category.description,
          assignments: {}
        };

        for (const assignment of category.assignments) {
        
          data[category.title]["assignments"][assignment.title] = {
            title: assignment.title,
            notes: assignment.notes,
            grade: assignment.grade,
            date: {
              due: assignment.dateDue,
              assigned: assignment.dateAssigned
            },
            points: {
              received: assignment.pointsReceived,
              max: assignment.pointsMax,
              bonus: assignment.pointsBonus
            }
          }; 
  
        }

      }

      result[classInfo.classId] = data;

    }

    //send off result
    return { status: 1, result: result };
  } catch (e) {
    //send error(s)
    logger.error(e);
    return { status: 2, result: "There was an unknown error fetching grades!" };
  }

}

module.exports = { getClassGradesPage, getClassGradesInfo, getAllClassGradesInfo, getClassGradesData, getAllClassGradesData };