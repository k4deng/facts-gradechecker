/* eslint-disable no-inner-declarations */

// config
const config = require("../../config.js");

// logger
const logger = require("../logger.js");

// puppeteer (for calling api)
const puppeteer = require("puppeteer");

// auth & direct api functions
const { puppeteerLogin, makeAuthRequest } = require("./reqhelper.js");

// get a classes grades (returns HTML)
async function getClassGradesPage(classID, term) {

  try {
    const ssInfo = await makeAuthRequest("https://nbsmobileapi.renweb.com/api/SchoolsAndStudents/v1?featureName=10");
    const defaultTerm = term 
      ? term //if term provided, use it
      : config.defaultTerm !== 0 //else if config default term exists
        ? config.defaultTerm  //use it
        : ssInfo.defaultTermId; //else grab school default term

    //start browser and load page
    let browser;
    if (config.devMode == true) {
      browser = await puppeteer.launch({ headless: !config.debug });
    } else {
      browser = await puppeteer.launch({
        headless: !config.debug,
        executablePath: "/usr/bin/chromium-browser",
        args: [ "--no-sandbox", "--headless", "--disable-gpu", "--disable-dev-shm-usage" ]
      });
    }
    const page = await browser.newPage();

    //login
    await puppeteerLogin(page);

    //load class grades page
    await page.goto(`https://${config.districtCode}.client.renweb.com/pwr/student/gradebook_ajax.cfm?studentid=${ssInfo.defaultStudentId}&isAjaxRequest=gradespage&classid=${classID}&termid=${defaultTerm}`, { waitUntil: "domcontentloaded" });

    //add css and grab html
    await page.addStyleTag({
      content: "body{font-family:\"Roboto\",sans-serif;}h3.grades_title,table.grades td.grade_data_center,table.grades th.grade_data_center{text-align:center}h3.grades_title{font-size:30px}.grades_head{font-weight:700;font-size:24px;border:0 solid #000;line-height:120%}.clearit{clear:both;width:0;height:0}.grades_head.btop{border-top-width:2px}.grades_head.bbottom{border-bottom-width:2px}.grades_head div{margin:1px 0}.grades_head .course_title,table.grades{margin-bottom:15px}.grades_head .grades_left{float:left;width:33%}.grades_head .grades_middle{float:left;width:34%;text-align:center}.grades_head .grades_right{float:right;width:33%;text-align:right}table.grades{clear:both;width:100%;border-collapse:collapse}table.grades th{font-size:16.5px;text-align:left}table.grades td.grade_data_right,table.grades th.grade_data_right{text-align:right}.grades_red{color:red}table.grades td{font-size:16.5px;line-height:100%}table.grades tr.cat_avg td{font-size:21px;font-weight:700;padding-top:5px}table.grades td span{display:none}.GCO_col1{width:55%}.GCO_col2,.GCO_col3,.GCO_col4{width:15%}.STD2_col1,.STD2_col2{width:50%}.GBK_col1{width:24%}.GBK_col10,.GBK_col2,.GBK_col3,.GBK_col4,.GBK_col5,.GBK_col6,.GBK_col7,.GBK_col8,.GBK_col9{width:7%}.GBK_col11{width:13%}.GBK_col_note{width:20%}@media only screen and (max-width:640px){table.grades thead{display:none}table.grades td{display:block;margin-left:15px}table.grades td span{display:inline-table;margin-right:3px;font-style:italic}table.grades td.grade_data_center,table.grades td.grade_data_right{text-align:left}table.grades td:first-child{margin:3px 0}.grades_head{font-size:19.5px;line-height:105%}table.grades tr.cat_avg td{font-size:18px}.GBK_col1,.GBK_col10,.GBK_col11,.GBK_col2,.GBK_col3,.GBK_col4,.GBK_col5,.GBK_col6,.GBK_col7,.GBK_col8,.GBK_col9,.GBK_col_note,.GCO_col1,.GCO_col2,.GCO_col3,.GCO_col4,.STD2_col1,.STD2_col2{width:100%}}"
    });
    const html = await page.$eval("html", el => el.innerHTML);

    //close the browser
    await browser.close();

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

      //skip classes hidden or with no grades
      if (classData.gradesDisabled == true) continue;
      if (config.hiddenClasses.includes(classData.classId)) continue;

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
      
      //skip classes hidden or with no grades
      if (classInfo.gradesDisabled == true) continue;
      if (config.hiddenClasses.includes(classInfo.classId)) continue;

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