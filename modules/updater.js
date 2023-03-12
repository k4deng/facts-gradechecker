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
const Hook = new webhook.Webhook(config.infoWebhookURL);

// database
const { database } = require("./enmap.js");

//notify for updates on discord
async function _updatesNotify() {
    try {
        let currentData = database.get("allClassGradesInfo")
        let newData = {};

        await factsapi.getAllClassGradesInfo().then(info => {
            newData = info.result;
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
            .setColor("#32a852");
        
        //take data and add to embed
        for (const [ subject, data ] of Object.entries(result)) {
            let changeMsg;

            //check for letter change
            if (data.letter.__old) {
                changeMsg = `\`${data.number.__old} (${data.letter.__old})\` ⇒ \`${data.number.__new} (${data.letter.__new})\``
            } else {
                changeMsg = `\`${data.number.__old} (${data.letter})\` ⇒ \`${data.number.__new} (${data.letter})\``
            }

            msg.addField(`${newData[subject].name.long} Grade Change`, changeMsg)
        }

        //send message
        await Hook.send(msg);
        return { status: 1, result: "Sent Notification" }
    } catch (error) {
        logger.error(error);
    }
}

//update all
async function updateAll() {
    try {
        await _updatesNotify();
        await updateClassesInfo();
        return { status: 1 } 
    } catch (error) {
        return { status: 2 } 
    }
}

//update classes info
async function updateClassesInfo() {
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

module.exports = { updateAll, updateClassesInfo }