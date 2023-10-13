// config
const config = require("../config.js");

// logger
const logger = require("./logger.js");

// facts api
const factsapi = require("../modules/factsapi/factsapi.js");

// json diff
const jsonDiff = require("json-diff");

// moment for time formatting
const moment = require("moment");

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
    const currentData = database.get("allClassGradesData");
    let newData = {};

    await factsapi.getAllClassGradesData().then(info => {
      newData = info.result;
      //newData[23904]["HW/CW"].assignments["Letter to Self"].grade = "92"; //SPOOF CHANGED DATA
      //newData[23904]["HW/CW"].assignments["Letter to Self"].points.received = 92;
    });

    //check for changes
    if (JSON.stringify(currentData) === JSON.stringify(newData)) return { status: 1, result: "No Changes" };

    //generate diff
    //const diff = jsonDiff.diffString(currentData, newData, { full: true, color: false })
    const diff = jsonDiff.diff(currentData, newData, { full: false });

    //new message for each class w/ changed data
    for (const [ subject, subjectData ] of Object.entries(diff)) {

      //init embed
      const msg = new webhook.MessageBuilder()
        .setName("FACTS Grade Checker")
        .setAvatar("https://yt3.ggpht.com/ytc/AMLnZu-jAYDQk4wACUEWS9tCfut-FxP62XE3PPj5RjcO=s900-c-k-c0x00ffffff-no-rj")
        .setColor("#2b2d31");
      
      //class was added/removed
      if (subject.endsWith("__deleted")) { 
        msg.addField(`${info[subject.replace("__deleted", "")].class.title} Removed`, "*Class removed from FACTS or bot config*");
        await dataHook.send(msg);
        continue;
      } else if (subject.endsWith("__added")) {
        const subjectInfo = await factsapi.getClassGradesInfo(subject.replace("__added", ""));
        msg.addField(`${subjectInfo.result.class.title} Added`, "*Class added to FACTS or bot config*");
        await dataHook.send(msg);
        continue;
      }

      //message and title to be sent to embed
      msg.setTitle(`${info[subject].class.title} Data Change`);
      let dataHookMessage = "";

      //get changes in each categories that were changed
      for (const [ cat, catData ] of Object.entries(subjectData)) {
        //category average changed
        /*if (catData.catAvg) {
          const title = `**\`${cat}\` Category Updated:**`;
          const message = `\`${catData.catAvg.__old}\` ⇒ \`${catData.catAvg.__new}\``;
          dataHookMessage = dataHookMessage + "\n" + title + "\n" + message;
        }*/
                
        //some assignment was changed
        if (catData.assignments) {
          for (const [ assignment, assignmentData ] of Object.entries(catData.assignments)) {

            //assignment added
            if (assignment.endsWith("__added")) {
              const title = `**\`${assignment.replace("__added", "")}\` (\`${cat}\`) Added:**`;
              let message = `Grade: \`${assignmentData.grade}\``;
              if (assignmentData.pts != assignmentData.grade) message += ` (\`${assignmentData.points.received}\`/\`${assignmentData.points.max}\`pts)`;
              dataHookMessage = dataHookMessage + "\n" + title + "\n" + message;
            }

            //assignment deleted
            if (assignment.endsWith("__deleted")) {
              const title = `**\`${assignment.replace("__deleted", "")}\` (\`${cat}\`) Deleted:**`;
              let message = `Was: \`${assignmentData.grade}\``;
              if (assignmentData.pts != assignmentData.grade) message += ` (\`${assignmentData.points.received}\`/\`${assignmentData.points.max}\`pts)`;
              dataHookMessage = dataHookMessage + "\n" + title + "\n" + message;
            }

            //pts/grade changed
            if (assignmentData.grade?.__old) {
              //grade was changed, not removed
              if (assignmentData.grade.__new != null) {
                const title = `**\`${assignment}\` (\`${cat}\`) Updated:**`;
                let message = `\`${assignmentData.grade.__old}`;
                if (assignmentData.points.received.__old != assignmentData.grade.__old) message += ` (${assignmentData.points.received.__old}/${assignmentData.points.max?.__old ?? currentData[subject][cat].assignments[assignment].points.max})\``;
                else message += "`";
                message += ` ⇒ \`${assignmentData.grade.__new}`;
                if (assignmentData.points.received.__new != assignmentData.grade.__new) message += ` (${assignmentData.points.received.__new}/${assignmentData.points.max?.__new ?? currentData[subject][cat].assignments[assignment].points.max})\``;
                else message += "`";
                dataHookMessage = dataHookMessage + "\n" + title + "\n" + message;
              }
            }

            //due date
            if (assignmentData.date?.due?.__old) {
              const title = `**\`${assignment}\` (\`${cat}\`) Updated:**`;
              const message = `Due Date: \`${moment(assignmentData.date.due.__old).format("M/D")}\` ⇒ \`${moment(assignmentData.date.due.__new).format("M/D")}\``;
              dataHookMessage = dataHookMessage + "\n" + title + "\n" + message;
            }

            //status changed (dropped)
            /*if (assignmentData.status?.__old) {
              //status was changed, not removed
              if (assignmentData.status.__new != null) {
                const title = `**\`${assignment}\` (\`${cat}\`) Updated:**`;
                const message = `Status: \`${assignmentData.status.__old}\` ⇒ \`${assignmentData.status.__new}\``;
                dataHookMessage = dataHookMessage + "\n" + title + "\n" + message;
              }
            }*/

            //notes changed
            if (assignmentData.notes?.__old != null) {
              const title = `**\`${assignment}\` (\`${cat}\`) Updated:**`;
              const message = `Notes: \`${assignmentData.notes.__old ? assignmentData.notes.__old : " "}\` ⇒ \`${assignmentData.notes.__new ? assignmentData.notes.__new : " "}\``;
              dataHookMessage = dataHookMessage + "\n" + title + "\n" + message;
            }

          }
        }

      }

      //send message
      msg.setDescription(dataHookMessage);
      await dataHook.send(msg);

    }

    return { status: 1, result: "Sent Notification" };
  } catch (error) {
    logger.error(error);
    return { status: 2, result: "Error" };
  }
}

//notify for info updates on discord
async function _updatesNotifyInfo() {
  try {
    const currentData = database.get("allClassGradesInfo");
    let newData = {};

    await factsapi.getAllClassGradesInfo().then(info => {
      newData = info.result;
      //newData[23904].termGrade.average = "92"; //SPOOF CHANGED DATA
    });

    //check for changes
    if (JSON.stringify(currentData) === JSON.stringify(newData)) return { status: 1, result: "No Changes" };

    //generate diff
    //const diff = jsonDiff.diffString(currentData, newData, { full: true, color: false })
    const diff = jsonDiff.diff(currentData, newData, { full: false });
    const result = {};

    //init embed
    const msg = new webhook.MessageBuilder()
      .setName("FACTS Grade Checker")
      .setAvatar("https://yt3.ggpht.com/ytc/AMLnZu-jAYDQk4wACUEWS9tCfut-FxP62XE3PPj5RjcO=s900-c-k-c0x00ffffff-no-rj")
      .setColor("#2b2d31");

    //find changed classes
    for (const [ subject ] of Object.entries(diff)) {

      //class was added/removed (ignore as message sent in data update)
      if (subject.endsWith("__deleted") || subject.endsWith("__added")) continue;

      //term grade changed
      if (JSON.stringify(currentData[subject].termGrade) !== JSON.stringify(newData[subject].termGrade)) {
        result[subject] = diff[subject].termGrade;

        //take data and add to embed
        for (const [ subject2, data ] of Object.entries(result)) {
          const changeMsg = `\`${data.average.__old} (${data.letter.__old ? data.letter.__old : data.letter})\` ⇒ \`${data.average.__new} (${data.letter.__old ? data.letter.__new : data.letter})\``;
          msg.addField(`${newData[subject2].class.title} Grade Change`, changeMsg);
        }
      }

    }

    //if everything was added/removed, don't send message
    if (Object.entries(diff).map(item => item[0]).every(item => /(__added|__deleted)$/.test(item))) { 
      return { status: 1, result: "No Notification Needs To Be Sent" };
    }

    //send message
    await infoHook.send(msg);
    return { status: 1, result: "Sent Notification" };
  } catch (error) {
    logger.error(error);
    return { status: 2, result: "Error" };
  }
}

//send notif if changes
async function sendNotif() {
  try {
    await _updatesNotifyInfo();
    return { status: 1 }; 
  } catch (error) {
    return { status: 2 }; 
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
    return { status: 1 }; 
  } catch (error) {
    return { status: 2 }; 
  }
}

//update classes info
async function updateAllClassGradesInfo() {
  try {
    const info = await factsapi.getAllClassGradesInfo();

    if (info.status == 2) return { status: 2 };
    database.set("allClassGradesInfo", info.result);
    
    return { status: 1 }; 
  } catch (error) {
    return { status: 2 }; 
  }
}

//update classes data
async function updateAllClassGradesData() {
  try {
    const info = await factsapi.getAllClassGradesData();

    if (info.status == 2) return { status: 2 };
    database.set("allClassGradesData", info.result);

    return { status: 1 }; 
  } catch (error) {
    return { status: 2 }; 
  }
}

module.exports = { sendNotif, updateAll, updateAllClassGradesInfo, updateAllClassGradesData };