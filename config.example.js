const config = {
    debug: false,

    appPort: "8080",

    webhookURL: "https://discord.com/api/webhooks/.../...",

    districtCode: "CODE",
    username: "example@gmail.com",
    password: "supersecurepassword",

    studentID: "123456789",
    defaultTerm: "1",

    classes: [{
        name: "Coding",
        id: "00001"
    },{
        name: "Lunch",
        id: "00002"
    }]
};

module.exports = config;