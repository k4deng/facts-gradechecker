// imports:
const config = require("../../config.js"); // config
const { authdb } = require("../enmap.js"); // authentication database
const axios = require("axios"); // axios (for calling api)
const fetch = require("node-fetch"); // fetch (also for calling api)
const cheerio = require("cheerio"); // cheerio (for starting oauth)
const crypto = require("crypto"); //crypto (for oauth)

// helper functions
function _parseJwt(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
}
function _base64URLEncode(str) {
  return str.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
function _sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

// oauth step 1:
// use oauth to get cookie, then use cookie
// when using the callback url to get tokens through
// authorization_code grant type
async function getAuthCode() {
  
  let code_verifier = null;
  try {

    // generate unique secrets
    const nonce = _base64URLEncode(crypto.randomBytes(32));
    code_verifier = _base64URLEncode(crypto.randomBytes(32));
    const code_challenge = _base64URLEncode(_sha256(code_verifier));
    const state = _base64URLEncode(crypto.randomBytes(32));

    //make callback url (we use it twice so i make it here)
    const returnUrl = "/connect/authorize/callback?"
    + `nonce=${nonce}`
    + "&response_type=code"
    + "&code_challenge_method=S256"
    + "&scope=openid%20aware3UserInfo%20aware3UserConfig%20offline_access%20nbsMobileAppApi"
    + `&code_challenge=${code_challenge}`
    + "&redirect_uri=com.renweb.accounts%3A%2Foauthredirect"
    + "&client_id=aware3"
    + `&state=${state}`;

    // open login page to generate form token and get a anti-forgery cookie
    const res1 = await axios("https://accounts.renweb.com/Account/Login?ReturnUrl=" + encodeURIComponent(returnUrl));
    const loginUrl = res1.request.res.responseUrl;
    const token = cheerio.load(res1.data)("input[name='__RequestVerificationToken']").val();
    const antiforgeryCookie =  res1.headers["set-cookie"][0];
    
    // post spoofed form data
    // we have to use fetch here since axios doesn't allow us to disable all the redirects :(
    const res2 = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": antiforgeryCookie,
      },
      body: `District=${config.districtCode}&Username=${config.username}&Password=${config.password}&signIn=LOG+IN&__RequestVerificationToken=${token}`,
      redirect: "manual", // Disable automatic redirect
    });

    //get cookie
    const cookie = res2.headers.raw()["set-cookie"][1].match(/idsrv=([^;]*)/)?.[1];
    
    //call callback url with cookie to get final code
    await axios({
      method: "get",
      url: "https://accounts.renweb.com" + returnUrl,
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1", 
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": `idsrv=${cookie}`
      },
      maxRedirects: 1, //callback redirects to local page, we just get the code straight from the redirected url without actually going there
      // note: the way i do this returns an error even if it works so we have to get the actual code in the catch block
    });


  } catch (error) {
    if (error.request._options.query.startsWith("code")) return { //not an error!
      code: error.request._options.query.split("&")[0].split("=")[1],
      code_verifier: code_verifier
    };
    console.error(error);
  }
}

// oauth step 2: use tokens in request (generating new tokens when expired)
async function getAuthTokens() {

  //check if tokens are expired, if not return them
  const expiration_time = await authdb.get("tokens")?.expiration_time ?? 0;
  if (expiration_time >= Math.floor(Date.now()/1000)) return await authdb.get("tokens");

  //check if refresh token exists, if so use to refresh
  const refresh_token = await authdb.get("tokens")?.refresh_token ?? null;
  if (refresh_token !== null) return await refreshAuthTokens(refresh_token);

  //generate new token from start of oauth flow
  try {

    const { code, code_verifier } = await getAuthCode(true);
    const data = `code=${code}&code_verifier=${code_verifier}&redirect_uri=com.renweb.accounts:/oauthredirect&client_id=aware3&grant_type=authorization_code`;

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
      data: data
    });

    //add timestamps to stored object in db
    res.data["issued_at"] = _parseJwt(res.data.access_token).iat;
    res.data["expiration_time"] = _parseJwt(res.data.access_token).exp;

    await authdb.set("tokens", res.data);
    return res.data;
  } catch (error) {
    //console.error(error);
  }
}

async function refreshAuthTokens(refresh_token) {

  //use refresh token to get new auth tokens
  try {
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
      data: `refresh_token=${refresh_token}&client_id=aware3&grant_type=refresh_token`
    });

    //add timestamps to stored object in db
    res.data["issued_at"] = _parseJwt(res.data.access_token).iat;
    res.data["expiration_time"] = _parseJwt(res.data.access_token).exp;

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