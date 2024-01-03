// config
const config = require("../../config.js");

// authentication database
const { authdb } = require("../enmap.js");

// puppeteer (for calling api)
const puppeteer = require("puppeteer");

// axios (also for calling api)
const axios = require("axios");

async function regenCookie(getAuthCodeAfter) {
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

  //open auth page, login
  await page.goto("https://accounts.renweb.com");
  await page.type("#rw-district-code", config.districtCode);
  await page.type("#rw-username", config.username);
  await page.type("#rw-password", config.password);
  await page.click("#next");

  //grab cookies when loaded
  await page.waitForSelector("body");
  const cookies = await page.cookies();

  //grab + save cookie
  await browser.close();
  authdb.set("idsrvCookie", cookies[4].value);

  if (getAuthCodeAfter) return await getAuthCode();
  return cookies[4].value;
}

async function getAuthCode() {

  const url = "https://accounts.renweb.com/connect/authorize/callback?nonce=616D30BD-33B4-4049-9DB2-9138DD5A3217&response_type=code&code_challenge_method=S256&scope=openid%20aware3UserInfo%20aware3UserConfig%20offline_access%20nbsMobileAppApi&code_challenge=fKpZgaD4Z314BBDa1034kEKIqwY85ECYyeJ9rFVv4hE&redirect_uri=com.renweb.accounts%3A%2Foauthredirect&client_id=aware3&state=QqUDt2hVsEZOwRwIElYCh-olVA3xMr9UduI0qct6xtY";
  const idsrvCookie = authdb.get("idsrvCookie");

  try {
    const res = await axios({
      method: "get",
      url: url,
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", 
        "Sec-Fetch-Site": "none", 
        "Accept-Encoding": "gzip, deflate", 
        "Sec-Fetch-Mode": "navigate", 
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1", 
        "Accept-Language": "en-US,en;q=0.9", 
        "Sec-Fetch-Dest": "document",
        "Cookie": `idsrv=${idsrvCookie}`
      },
      maxRedirects: 1,
    });

    //need to regen cookie and login again
    if (res.request.path.startsWith("/Account/Login?")) {
      return await regenCookie(true);
    }
  } catch (error) {
    if (error.request._options.query.startsWith("code")) return error.request._options.query.split("&")[0].split("=")[1];
    console.error(error);
  }
}

async function getAuthTokens() {

  //consts for checking for expired tokens
  const genDate = await authdb.get("tokens")?.generated ?? 0;
  const HOUR = 1000 * 60 * 60;
  const anHourAgo = Date.now() - HOUR;

  //return if tokens aren't expired yet
  if (genDate >= anHourAgo) return await authdb.get("tokens");

  //generate new token
  try {
    const code = await getAuthCode();
    const res = await axios({
      method: "post",
      url: "https://accounts.renweb.com/connect/token",
      headers: {
        "Accept": "*/*", 
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", 
        "Accept-Encoding": "gzip, deflate", 
        "User-Agent": "CFNetwork/1485 Darwin/23.1.0", 
        "Accept-Language": "en-US,en;q=0.9"
      },
      data: `code=${code}&code_verifier=0N5uQFllFe07PUhTot4hn4oBaUNTN3nfwOUvc3Ln0X8&redirect_uri=com.renweb.accounts:/oauthredirect&client_id=aware3&grant_type=authorization_code`
    });
    res.data["generated"] = Date.now();
    await authdb.set("tokens", res.data);
    return res.data;
  } catch (error) {
    console.error(error);
  }
}

async function makeAuthRequest(url) {
  const { access_token } = await getAuthTokens();

  const res = await axios.get(url, {
    headers: {
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${access_token}`, 
      "Accept": "*/*", 
      "Accept-Language": "en-US,en;q=0.9", 
      "Accept-Encoding": "gzip, deflate", 
      "User-Agent": "CFNetwork/1410.0.3 Darwin/22.6.0", 
    }
  });

  return res.data;
}

module.exports = { makeAuthRequest };