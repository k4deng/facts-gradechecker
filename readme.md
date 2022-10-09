# About
FACTS Grade Checker is a simple little program to check the grades of someone using FACTS (RenWeb) at their school and update them of changes. All of the functions and routes are labeled at `site.com/` and have links to those pages.

The program can
* check your grades and show them to you (`/overview`)
* show you the full grade sheet for a class (`/class/{classID}`)

And some internal functions are:
* View the contents of the database (`/database`)
* Check for changes in grades, update database and post to discord webhook (`/update`)

I have set up a bot to go to `/update` every few minutes so I can get a notification when there are updates.

# Setup and Run

## Filling out Config
You will first have to rename `config.example.js` to `config.js` to get started.

**Step 1:**
Open `config.js` and fill out the information in lines 2-12.

**Step 2:**
To find your `studentID` navigate to your schools portal and go to the classes page (https://*district*.client.renweb.com/pwr/school/classes.cfm).
Click on a class and find the `studentid` query in the url and copy the value of it. It should look something like 0000000.
Finally, paste that value into the config file.

**Step 3:**
`defaultTerm` is the term (or quarter) that will be used to search for grades.

**Step 4:**
Finally, you will need to fill out the `classes` key on line 15. Start by making a new object in the array for every class you wish to use.
Fill out the name key (Anything you want, it is the user-friendly version of the id) and navigate to each classes page (HINT: you did this in step 2).
Copy the value of the `classid` query from the url and paste it into the object for the appropriate class.
Now you should have something that looks like this:
```json
classes: [{
    name: "Math",
    id: "62015"
},{
    name: "English",
    id: "62067"
},{ 
    name: "Science",
    id: "62092"
},{ 
    name: "History",
    id: "62046"
},{ 
    name: "World Language",
    id: "62021"
},{ 
    name: "Study Hall",
    id: "62074"
}]
```

You are now done filling out the config!

### How to start (docker)
1. clone repo
2. fill out `docker-compose.yml` with necessary info
3. fill out config (see section "Filling out Config" above)
4. `cd` into your directory
5. run `docker compose up -d`
6. profit!

### How to start (barebones node.js)
1. clone repo
2. (see section "Filling out Config" above)
3. run `npm install`
4. and finally `node index.js`
5. profit!