# About
FACTS Grade Checker is a simple little program to check the grades of someone using FACTS (RenWeb) at their school and update them of changes. All the functions and routes are labeled at `site.com/` and have links to those pages.

The program can
* check your grades and show them to you (`/overview`)
* show you the full grade sheet for a class (`/class/{classID}`)
* show a grid of your classes homework (`/homework`)

Additionally, some internal functions are:
* View the contents of the database (`/database`)
* Check for changes in grades, update database and post to discord webhook (`/update`)

I have set up a bot to go to `/update` every few minutes so I can get a notification when there are updates.

# Setup and Run

## Filling out Config
You will first have to rename `config.example.js` to `config.js` to get started.

**Step 1:**
Open `config.js` and fill out the information in lines 2-8 with the app's data you have, including webhooks and app port.

**Step 2:**
On lines 10-12 enter your district code, username, and password for facts-gradechecker to get your grades.

**Step 3:**
Choose your `defaultTerm` which is the term (or quarter) that will be used to search for grades. If you leave it at `0` it will default to the current term as provided by the school.

**Step 4:**
Finally, you can fill out the `classList` array on line 16 and the type on line 17 if you want to add a class blacklist or whitelist.

To find what a class' ID is, you can start the app once with no whitelist/blacklist and then navigate to `app.com/database`. There, you can find each class as an object under `data` and `allClassGradesInfo` and look in each object to find what class ID is associated with each class.
After doing so, you will have a whitelist or blacklist to ignore "utility" classes if they are used.

After that is done, you are now done filling out the config!

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
