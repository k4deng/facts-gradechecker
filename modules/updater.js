// config
const config = require("../config.js");

// logger
const logger = require("./logger.js");

// facts api
const factsapi = require("./factsapi.js");

// json diff
const jsonDiff = require('json-diff');

// discord webhooks
const webhook = require("webhook-discord");
const dataHook = new webhook.Webhook(config.allDataWebhookURL);
const infoHook = new webhook.Webhook(config.infoWebhookURL);

// database
const { database } = require("./enmap.js");

//notify for data updates on discord
async function _updatesNotifyData() {
    try {
        const info = database.get("allClassGradesInfo");
        const currentData = database.get("allClassGradesData")
        let newData = {};

        await factsapi.getAllClassGradesData().then(info => {
            newData = info.result;
            //newData[22244].Quizzes.catAvg = "92"; //SPOOF CHANGED DATA ==============================================================
        });

        //check for changes
        if (JSON.stringify(currentData) === JSON.stringify(newData)) return { status: 1, result: "No Changes" };

        //generate diff
        //const diff = jsonDiff.diffString(currentData, newData, { full: true, color: false })
        const diff = jsonDiff.diff(currentData, newData, { full: false })

        //new message for each class w/ changed data
        for (const [ subject, subjectData ] of Object.entries(diff)) {

            //init embed
            const msg = new webhook.MessageBuilder()
                .setName("FACTS Grade Checker")
                .setAvatar("https://yt3.ggpht.com/ytc/AMLnZu-jAYDQk4wACUEWS9tCfut-FxP62XE3PPj5RjcO=s900-c-k-c0x00ffffff-no-rj")
                .setColor("#2b2d31")
                .setTitle(`${info[subject].name.long} Data Change`);

            //message to be sent to embed
            let dataHookMessage = "";

            //get changes in each categories that were changed
            for (const [ cat, catData ] of Object.entries(subjectData)) {
                //category average changed
                if (catData.catAvg) {
                    let title = `**\`${cat}\` Category Updated:**`;
                    let message = `\`${catData.catAvg.__old}\` ⇒ \`${catData.catAvg.__new}\``;
                    dataHookMessage = dataHookMessage + `\n` + title + `\n` + message;
                }
                
                //some assignment was changed
                if (catData.formattedData) {
                    for (const [ assignment, assignmentData ] of Object.entries(catData.formattedData)) {

                        //assignment added
                        if (assignment.endsWith("__added")) {
                            let title = `**\`${assignment.replace("__added", "")}\` (\`${cat}\`) Added:**`;
                            let message = `Grade: \`${assignmentData.gradePoints}\``;
                            if (assignmentData.pts != assignmentData.gradePoints) message += ` (\`${assignmentData.pts}\`/\`${assignmentData.maxPts}\`pts)`;
                            dataHookMessage = dataHookMessage + `\n` + title + `\n` + message;
                        }

                        //assignment deleted
                        if (assignment.endsWith("__deleted")) {
                            let title = `**\`${assignment.replace("__deleted", "")}\` (\`${cat}\`) Deleted:**`;
                            let message = `Was: \`${assignmentData.gradePoints}\``;
                            if (assignmentData.pts != assignmentData.gradePoints) message += ` (\`${assignmentData.pts}\`/\`${assignmentData.maxPts}\`pts)`;
                            dataHookMessage = dataHookMessage + `\n` + title + `\n` + message;
                        }

                        //pts/gradePoints changed
                        if (assignmentData.gradePoints?.__old) {
                            //grade was changed, not removed
                            if (assignmentData.gradePoints.__new != null) {
                                let title = `**\`${assignment}\` (\`${cat}\`) Updated:**`;
                                let message = `\`${assignmentData.gradePoints.__old}`;
                                if (assignmentData.pts.__old != assignmentData.gradePoints.__old) message += ` (${assignmentData.pts.__old}/${assignmentData.maxPts?.__old ?? currentData[subject][cat].formattedData[assignment].maxPts})\``;
                                    else message += `\``
                                message += ` ⇒ \`${assignmentData.gradePoints.__new}`;
                                if (assignmentData.pts.__new != assignmentData.gradePoints.__new) message += ` (${assignmentData.pts.__new}/${assignmentData.maxPts?.__new ?? currentData[subject][cat].formattedData[assignment].maxPts})\``;
                                    else message += `\``
                                dataHookMessage = dataHookMessage + `\n` + title + `\n` + message;
                            }
                        }
                    }
                }

            }

            //send message
            msg.setDescription(dataHookMessage)
            await dataHook.send(msg);

        }

        return { status: 1, result: "Sent Notification" }
    } catch (error) {
        logger.error(error);
        return { status: 2, result: "Error" }
    }
}

//notify for info updates on discord
async function _updatesNotifyInfo() {
    try {
        let currentData = database.get("allClassGradesInfo")
        let newData = {};

        await factsapi.getAllClassGradesInfo().then(info => {
            newData = info.result;
            //newData[22244].termGrade.number = "92"; //SPOOF CHANGED DATA ==============================================================
        });

        //check for changes
        if (JSON.stringify(currentData) === JSON.stringify(newData)) return { status: 1, result: "No Changes" };

        //generate diff
        //const diff = jsonDiff.diffString(currentData, newData, { full: true, color: false })
        const diff = jsonDiff.diff(currentData, newData, { full: true })
        let result = {};

        //find changed classes
        for (const [ subject ] of Object.entries(currentData)) {
            if (JSON.stringify(currentData[subject].termGrade) !== JSON.stringify(newData[subject].termGrade)) {
                result[subject] = diff[subject].termGrade;
            }
        }

        //init embed
        const msg = new webhook.MessageBuilder()
            .setName("FACTS Grade Checker")
            .setAvatar("https://yt3.ggpht.com/ytc/AMLnZu-jAYDQk4wACUEWS9tCfut-FxP62XE3PPj5RjcO=s900-c-k-c0x00ffffff-no-rj")
            .setColor("#2b2d31");
        
        //take data and add to embed
        for (const [ subject, data ] of Object.entries(result)) {
            const changeMsg = `\`${data.number.__old} (${data.letter.__old ? data.letter.__old : data.letter})\` ⇒ \`${data.number.__new} (${data.letter.__old ? data.letter.__new : data.letter})\``;
            msg.addField(`${newData[subject].name.long} Grade Change`, changeMsg)
        }

        //send message
        await infoHook.send(msg);
        return { status: 1, result: "Sent Notification" }
    } catch (error) {
        logger.error(error);
        return { status: 2, result: "Error" }
    }
}

//send notif if changes
async function sendNotif() {
    try {
        await _updatesNotifyInfo();
        return { status: 1 } 
    } catch (error) {
        return { status: 2 } 
    }
}

//update all
async function updateAll() {
    try {
        const notifyResData = await _updatesNotifyData();
        if (notifyResData.result == "No Changes") return { status: 1 };
        const notifyResInfo = await _updatesNotifyInfo();
        await updateAllClassGradesData();
        if (notifyResInfo.result == "No Changes" ) return { status: 1 };
        await updateAllClassGradesInfo();
        return { status: 1 } 
    } catch (error) {
        return { status: 2 } 
    }
}

//update classes info
async function updateAllClassGradesInfo() {
    try {
        await factsapi.getAllClassGradesInfo()
        .then(info => {
            if (info.status == 2) return { status: 2 };
            database.set("allClassGradesInfo", info.result);
        });
        return { status: 1 } 
    } catch (error) {
        return { status: 2 } 
    }
}

//update classes data
async function updateAllClassGradesData() {
    try {
        await factsapi.getAllClassGradesData()
        .then(info => {
            if (info.status == 2) return { status: 2 };
            database.set("allClassGradesData", info.result);
        });
        return { status: 1 } 
    } catch (error) {
        return { status: 2 } 
    }
}

module.exports = { sendNotif, updateAll, updateAllClassGradesInfo, updateAllClassGradesData }