// config
const config = require("../config.js");

// logger
const logger = require("./logger.js");

// puppeteer (for calling api)
const puppeteer = require("puppeteer");

//login helper function
async function _login(page) {
    //go to login page
    await page.goto(`https://${config.districtCode}.client.renweb.com/pwr/`);
    //type in info
    await page.type('#username', config.username);
    await page.type('#password', config.password);
    await page.click('#UserType_Student');
    //login
    await page.click('#submit')
    //wait for login to process
    await page.waitForSelector('body')
}

// get a classes grades (returns HTML)
async function getClassGradesPage(classID, term = config.defaultTerm) {

    try {
        //start browser and load page
        let browser;
        if (config.devMode == true) {
            browser = await puppeteer.launch({ headless: !config.debug });
        } else {
            browser = await puppeteer.launch({
                headless: !config.debug,
                executablePath: '/usr/bin/chromium-browser',
                args: [
                '--no-sandbox',
                '--headless',
                '--disable-gpu',
                '--disable-dev-shm-usage'
                ]
            });
        }
        const page = await browser.newPage();

        //login
        await _login(page);

        //load class grades page
        await page.goto(`https://${config.districtCode}.client.renweb.com/pwr/student/gradebook_ajax.cfm?studentid=${config.studentID}&isAjaxRequest=gradespage&classid=${classID}&termid=${term}`, { waitUntil: "domcontentloaded" })

        //add css and grab html
        await page.addStyleTag({
            content: 'body{font-family:"Roboto",sans-serif;}h3.grades_title,table.grades td.grade_data_center,table.grades th.grade_data_center{text-align:center}h3.grades_title{font-size:30px}.grades_head{font-weight:700;font-size:24px;border:0 solid #000;line-height:120%}.clearit{clear:both;width:0;height:0}.grades_head.btop{border-top-width:2px}.grades_head.bbottom{border-bottom-width:2px}.grades_head div{margin:1px 0}.grades_head .course_title,table.grades{margin-bottom:15px}.grades_head .grades_left{float:left;width:33%}.grades_head .grades_middle{float:left;width:34%;text-align:center}.grades_head .grades_right{float:right;width:33%;text-align:right}table.grades{clear:both;width:100%;border-collapse:collapse}table.grades th{font-size:16.5px;text-align:left}table.grades td.grade_data_right,table.grades th.grade_data_right{text-align:right}.grades_red{color:red}table.grades td{font-size:16.5px;line-height:100%}table.grades tr.cat_avg td{font-size:21px;font-weight:700;padding-top:5px}table.grades td span{display:none}.GCO_col1{width:55%}.GCO_col2,.GCO_col3,.GCO_col4{width:15%}.STD2_col1,.STD2_col2{width:50%}.GBK_col1{width:24%}.GBK_col10,.GBK_col2,.GBK_col3,.GBK_col4,.GBK_col5,.GBK_col6,.GBK_col7,.GBK_col8,.GBK_col9{width:7%}.GBK_col11{width:13%}.GBK_col_note{width:20%}@media only screen and (max-width:640px){table.grades thead{display:none}table.grades td{display:block;margin-left:15px}table.grades td span{display:inline-table;margin-right:3px;font-style:italic}table.grades td.grade_data_center,table.grades td.grade_data_right{text-align:left}table.grades td:first-child{margin:3px 0}.grades_head{font-size:19.5px;line-height:105%}table.grades tr.cat_avg td{font-size:18px}.GBK_col1,.GBK_col10,.GBK_col11,.GBK_col2,.GBK_col3,.GBK_col4,.GBK_col5,.GBK_col6,.GBK_col7,.GBK_col8,.GBK_col9,.GBK_col_note,.GCO_col1,.GCO_col2,.GCO_col3,.GCO_col4,.STD2_col1,.STD2_col2{width:100%}}'
        });
        const html = await page.$eval('html', el => el.innerHTML);

        //close the browser
        await browser.close();

        //send off result
        return { status: 1, result: html }
    } catch (e) {
        //send error(s)
        logger.error('"There was an unknown error fetching grades: ' + e)
        return { status: 2, result: "There was an unknown error fetching grades!" }
    }

}

// get a classes grade information (returns JSON)
async function getClassGradesInfo(classID, term = config.defaultTerm) {

    try {
        //start browser and load page
        let browser;
        if (config.devMode == true) {
            browser = await puppeteer.launch({ headless: !config.debug });
        } else {
            browser = await puppeteer.launch({
                headless: !config.debug,
                executablePath: '/usr/bin/chromium-browser',
                args: [
                '--no-sandbox',
                '--headless',
                '--disable-gpu',
                '--disable-dev-shm-usage'
                ]
            });
        }
        const page = await browser.newPage();

        //login
        await _login(page);

        //load class grades page
        await page.goto(`https://${config.districtCode}.client.renweb.com/pwr/student/gradebook_ajax.cfm?studentid=${config.studentID}&isAjaxRequest=gradespage&classid=${classID}&termid=${term}`, { waitUntil: "domcontentloaded" })

        await page.waitForSelector('body')

        //get term grade location
        let [termGradeXpath] = await page.$x('/html/body/div[7]/div[2]')
        if (await termGradeXpath.evaluate(el => el.innerText) == "") {
            [termGradeXpath] = await page.$x('/html/body/div[8]/div[2]')
        }

        //get term grade number and style
        let termGradeNumber, termGradeLetter, termGradeStyle;
        if (await termGradeXpath.evaluate(el => el.innerText) == "No grades available for this term") {
            termGradeNumber = "100";
            termGradeLetter = "A+";
            termGradeStyle = "success";
        } else {
            termGradeNumber = await termGradeXpath.evaluate(el => el.innerText.match(/\d+/g).join([]));
            termGradeLetter = await termGradeXpath.evaluate(el => el.innerText.match(/[^0-9 ]/g).join([]));
            termGradeStyle =
                termGradeNumber >= 90 //A
                ? "success"
                : termGradeNumber >= 80 //B
                    ? "warning"
                    : termGradeNumber >= 70 //C
                    ? "danger"
                    : termGradeNumber >= 60 //D
                        ? "danger"
                        : "outline-danger"; //F
        }

        const info = {
            teacher: await page.$eval('div.grades_head:nth-child(2) > div:nth-child(3)', el => el.innerText),
            name: {
                short: await page.$eval('div.grades_head:nth-child(3) > div:nth-child(1)', el => el.innerText),
                long: await page.$eval('.course_title', el => el.innerText)
            },
            termGrade: {
                number: termGradeNumber,
                letter: termGradeLetter,
                style: termGradeStyle
            }
        }

        //close the browser
        await browser.close();

        //send off result
        return { status: 1, result: info }
    } catch (e) {
        //send error(s)
        logger.error(e)
        return { status: 2, result: "There was an unknown error fetching grades!" }
    }

}

// get all class grades information (returns JSON)
async function getAllClassGradesInfo(term = config.defaultTerm) {

    let result = {};

    try {
        //start browser and load page
        let browser;
        if (config.devMode == true) {
            browser = await puppeteer.launch({ headless: !config.debug });
        } else {
            browser = await puppeteer.launch({
                headless: !config.debug,
                executablePath: '/usr/bin/chromium-browser',
                args: [
                '--no-sandbox',
                '--headless',
                '--disable-gpu',
                '--disable-dev-shm-usage'
                ]
            });
        }
        const page = await browser.newPage();

        //login
        await _login(page);

        //open single class grades
        async function _openClassGrades(page, classID){
            await page.goto(
                `https://${config.districtCode}.client.renweb.com/pwr/student/gradebook_ajax.cfm?studentid=${config.studentID}&isAjaxRequest=gradespage&classid=${classID}&termid=${term}`,
                { waitUntil: "domcontentloaded" }
            )
        }

        //get the data from class and add to results
        async function _getClassData(page, classID){

            //open class
            await _openClassGrades(page, classID);

            //wait for load
            await page.waitForSelector('body');

            //get term grade location
            let [termGradeXpath] = await page.$x('/html/body/div[7]/div[2]')
            if (await termGradeXpath.evaluate(el => el.innerText) == "") {
                [termGradeXpath] = await page.$x('/html/body/div[8]/div[2]')
            }

            //get term grade number and style
            let termGradeNumber, termGradeLetter, termGradeStyle;
            if (await termGradeXpath.evaluate(el => el.innerText) == "No grades available for this term") {
                termGradeNumber = "100";
                termGradeLetter = "A+";
                termGradeStyle = "success";
            } else {
                termGradeNumber = await termGradeXpath.evaluate(el => el.innerText.match(/\d+/g).join([]));
                termGradeLetter = await termGradeXpath.evaluate(el => el.innerText.match(/[^0-9 ]/g).join([]));
                termGradeStyle =
                    termGradeNumber >= 90 //A
                    ? "success"
                    : termGradeNumber >= 80 //B
                        ? "warning"
                        : termGradeNumber >= 70 //C
                        ? "danger"
                        : termGradeNumber >= 60 //D
                            ? "danger"
                            : "outline-danger"; //F
            }

            //add data to result
            result[classID] = {
                teacher: await page.$eval('div.grades_head:nth-child(2) > div:nth-child(3)', el => el.innerText),
                name: {
                    short: await page.$eval('div.grades_head:nth-child(3) > div:nth-child(1)', el => el.innerText),
                    long: await page.$eval('.course_title', el => el.innerText)
                },
                termGrade: {
                    number: termGradeNumber,
                    letter: termGradeLetter,
                    style: termGradeStyle
                }
            }
        }

        //loop through classes
        for (const subject of config.classes) {
            await _getClassData(page, subject.id)
        }

        //close the browser
        await browser.close();

        //send off result
        return { status: 1, result: result }
    } catch (e) {
        //send error(s)
        logger.error(e)
        return { status: 2, result: "There was an unknown error fetching grades!" }
    }

}

// get all assignments & grades data (returns JSON)
async function getClassGradesData(classID, term = config.defaultTerm) {

    try {
        //start browser and load page
        let browser;
        if (config.devMode == true) {
            browser = await puppeteer.launch({ headless: !config.debug });
        } else {
            browser = await puppeteer.launch({
                headless: !config.debug,
                executablePath: '/usr/bin/chromium-browser',
                args: [
                '--no-sandbox',
                '--headless',
                '--disable-gpu',
                '--disable-dev-shm-usage'
                ]
            });
        }
        const page = await browser.newPage();

        //login
        await _login(page);

        //load class grades page
        await page.goto(`https://${config.districtCode}.client.renweb.com/pwr/student/gradebook_ajax.cfm?studentid=${config.studentID}&isAjaxRequest=gradespage&classid=${classID}&termid=${term}`, { waitUntil: "domcontentloaded" })
        await page.waitForSelector('body')

        let categories = 3;
        if (!! await page.$('table.grades:nth-child(12) tr')) categories = 4;
        
        let data = {};
        let colCounter = 5;
        for (let i = 0; i < categories; i++) {

            const uncleanData = await page.$$eval(`table.grades:nth-child(${colCounter + 1}) tr`, rows => {
                return Array.from(rows, row => {
                    const columns = row.querySelectorAll('td');
                    return Array.from(columns, column => {
                        if (column.innerText.indexOf(': ') !== -1) return column.innerText.slice(column.innerText.indexOf(":") + 1);;
                        if (column.innerText.indexOf(':') !== -1) return column.innerText.slice(column.innerText.indexOf(":") + 1);;
                        return column.innerText;
                    });
                });
            });
    
            let formattedData = {};
            let catAvg;
            for (const value of uncleanData) {
                if (value == "") continue;
                if (value[0] == "Category Average") { catAvg = parseFloat(value[1]); continue; }
                formattedData[value[0]] = {
                    pts: parseFloat(value[1]),
                    maxPts: parseFloat(value[2]),
                    gradePoints: parseFloat(value[3]),
                    status: value[4],
                    due: value[5]
                }
                if (value[9] !== "") formattedData[value[0]]["note"] = value[9];
            }

            data[await page.$eval(`div.grades_head:nth-child(${colCounter}) > div:nth-child(1)`, el => el.innerText)] = {
                weight: await page.$eval(`div.grades_head:nth-child(${colCounter}) > div:nth-child(3)`, el => parseFloat(el.innerText.split('= ')[1])),
                catAvg: catAvg,
                formattedData
            }

            colCounter += 2;
     
        }

        //close the browser
        await browser.close();

        //send off result
        return { status: 1, result: data }
    } catch (e) {
        //send error(s)
        logger.error(e)
        return { status: 2, result: "There was an unknown error fetching grades!" }
    }

}

// get all assignments & grades data for all classes (returns JSON)
async function getAllClassGradesData(term = config.defaultTerm) {

    let result = {};

    try {
        //start browser and load page
        let browser;
        if (config.devMode == true) {
            browser = await puppeteer.launch({ headless: !config.debug });
        } else {
            browser = await puppeteer.launch({
                headless: !config.debug,
                executablePath: '/usr/bin/chromium-browser',
                args: [
                '--no-sandbox',
                '--headless',
                '--disable-gpu',
                '--disable-dev-shm-usage'
                ]
            });
        }
        const page = await browser.newPage();

        //login
        await _login(page);

        //open single class grades
        async function _openClassGrades(page, classID){
            await page.goto(
                `https://${config.districtCode}.client.renweb.com/pwr/student/gradebook_ajax.cfm?studentid=${config.studentID}&isAjaxRequest=gradespage&classid=${classID}&termid=${term}`,
                { waitUntil: "domcontentloaded" }
            )
        }

        //get the data from class and add to results
        async function _getClassData(page, classID){

            //open class
            await _openClassGrades(page, classID);

            //wait for load
            await page.waitForSelector('body');

            let categories = 3;
            if (!! await page.$('table.grades:nth-child(12) tr')) categories = 4;
            
            let data = {};
            let colCounter = 5;
            for (let i = 0; i < categories; i++) {

                const uncleanData = await page.$$eval(`table.grades:nth-child(${colCounter + 1}) tr`, rows => {
                    return Array.from(rows, row => {
                        const columns = row.querySelectorAll('td');
                        return Array.from(columns, column => {
                            if (column.innerText.indexOf(': ') !== -1) return column.innerText.slice(column.innerText.indexOf(":") + 1);;
                            if (column.innerText.indexOf(':') !== -1) return column.innerText.slice(column.innerText.indexOf(":") + 1);;
                            return column.innerText;
                        });
                    });
                });
        
                let formattedData = {};
                let catAvg;
                for (const value of uncleanData) {
                    if (value == "") continue;
                    if (value[0] == "Category Average") { catAvg = parseFloat(value[1]); continue; }
                    formattedData[value[0]] = {
                        pts: parseFloat(value[1]),
                        maxPts: parseFloat(value[2]),
                        gradePoints: parseFloat(value[3]),
                        status: value[4],
                        due: value[5]
                    }
                    if (value[9] !== "") formattedData[value[0]]["note"] = value[9];
                }

                data[await page.$eval(`div.grades_head:nth-child(${colCounter}) > div:nth-child(1)`, el => el.innerText)] = {
                    weight: await page.$eval(`div.grades_head:nth-child(${colCounter}) > div:nth-child(3)`, el => parseFloat(el.innerText.split('= ')[1])),
                    catAvg: catAvg,
                    formattedData
                }

                colCounter += 2;
        
            }

            result[classID] = data;
        }

        //loop through classes
        for (const subject of config.classes) {
            await _getClassData(page, subject.id)
        }

        //close the browser
        await browser.close();

        //send off result
        return { status: 1, result: result }
    } catch (e) {
        //send error(s)
        logger.error(e)
        return { status: 2, result: "There was an unknown error fetching grades!" }
    }

}

module.exports = { getClassGradesPage, getClassGradesInfo, getAllClassGradesInfo, getClassGradesData, getAllClassGradesData }