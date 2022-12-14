/*
This Script Scrapes and Creates Article Templates for LVSB
Currently Compatible leagues: NBA, NCAAB, NHL
*/


//modules
// const admin = require("firebase-admin"); // Google Firebase Admin SDK
// const serviceAccount = require("./ognliveodds-firebase-adminsdk-4z944-22d4479fea.json"); // Auth for GCP (Google Cloud Platform)
const fetch = require('node-fetch'); //requests is deprecated
const cheerio = require('cheerio'); //jquery on node
const moment = require('moment'); //for easier time and date formatting
const beautify = require('js-beautify');
const fs = require('fs');//for saving the html file on local storage #debug
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
//Initialized Required modules
//debug
let debug = true; //true or false

//begin date formats
const yyyymmdd = moment().format('YYYY-MM-DD'); // This format will be used to create the docIDs in Firestore.
const exactmoment = moment().format('YYYY-MMMM-DD_h:mm:ss_a');

//global variables end

app.use(bodyParser.urlencoded({ extended: true }));
const port = 3000;
app.get('/', (req,res) => {
    res.sendFile(__dirname +'/scraper.html');
  });
app.post('/', async (req,res) => {
  const data = req.body;
  let author = authorName(data.author);
  let league = leagueName(data.url1);
  let partnerID = partnerid(author);
  let sitesHTML = await fetchURL(data.url1,data.url2,data.url3,data.url4,data.url5);
  let sportsOptionsObject = handleSource1(sitesHTML[0]);
  let bovadaObject = handleSource2(sitesHTML[1]);

  let team1Object = handleSource3(sitesHTML[2]);
  let team2Object = handleSource4(sitesHTML[3]);
  let excerptObj = handleSource5(sitesHTML[4]);

  let scrapedObject = handleObjects(sportsOptionsObject,bovadaObject,author,league,partnerID,data.order,team1Object,team2Object,excerptObj);
  let writeTemplate =injectHTML(scrapedObject);
  res.send(`<a href="http://beta.scraper.ogntechsite.com/scraper/out/${writeTemplate}">Download Template</a><br><a href="/">Go Back</a>`)
})

app.listen(port, () => console.log(`Scraper Service listening on port ${port}`))



/*

        FUNCTIONS

*/

//inject scraped data to html
function injectHTML(data){
    let templateFile = fs.readFileSync(`templates/wordpress.html`,'utf8'); //read the template from here
    // let templateFile = fs.readFileSync(`templates/template_${data.league}.html`,'utf8'); //read the template from here
    let templateMin = eval(templateFile);
    let template = beautify.html(templateMin,{
        "indent_size": "4",
        "indent_char": " ",
        "max_preserve_newlines": "5",
        "preserve_newlines": true
      });
    let fileName = `(${data.order}) ${data.author} [${data.league}] ${data.visitingTeam} at ${data.homeTeam}.html`
    fs.writeFileSync(`out/${fileName}`, template);
    savetoDB(template, data);//invoke savetodb Firebase Function
    return fileName;
}

//Fetch URL Response and Pass it handler function
async function fetchURL(url1, url2, url3, url4, url5) {
    const fetch1 = fetch(url1).then(res => {
        if (res.status === 200) {
            return res.text();
        } else {
            let err_string = `Fetching Error in SportsDirect URL. Server Replied with HTTP response code ${res.status}`;
            let source = `Fetch::BadHTTPStatus-SportsDirect`
            errHandler(err_string, source);
        }
    })
    .catch(err => errHandler(err, `Fetch::GeneralError-SportsDirect`));
    const fetch2 = fetch(url2).then(res => {
        if (res.status === 200) {
            return res.text();
        } else {
            let err_string = `Fetching Error in SportsDirect URL. Server Replied with HTTP response code ${res.status}`;
            let source = `Fetch::BadHTTPStatus-SportsDirect`
            errHandler(err_string, source);
        }
    })
    .catch(err => errHandler(err, `Fetch::GeneralError-SportsDirect`));

    const fetch3 = fetch(url3).then(res => {
        if (res.status === 200) {
            return res.text();
        } else {
            let err_string = `Fetching Error in Team1 URL. Server Replied with HTTP response code ${res.status}`;
            let source = `Fetch::BadHTTPStatus-SportsDirect`
            errHandler(err_string, source);
        }
    })
    .catch(err => errHandler(err, `Fetch::GeneralError-Team1`));

    const fetch4 = fetch(url4).then(res => {
        if (res.status === 200) {
            return res.text();
        } else {
            let err_string = `Fetching Error in Team2 URL. Server Replied with HTTP response code ${res.status}`;
            let source = `Fetch::BadHTTPStatus-SportsDirect`
            errHandler(err_string, source);
        }
    })
    .catch(err => errHandler(err, `Fetch::GeneralError-Team2`));

    const fetch5 = fetch(url5).then(res => {
        if (res.status === 200) {
            return res.text();
        } else {
            let err_string = `Fetching Error in Except URL. Server Replied with HTTP response code ${res.status}`;
            let source = `Fetch::BadHTTPStatus-SportsDirect`
            errHandler(err_string, source);
        }
    })
    .catch(err => errHandler(err, `Fetch::GeneralError-Team2`));
    sitedata = await Promise.all([fetch1, fetch2, fetch3, fetch4, fetch5]).catch(err => errHandler(err, `Fetch::Promise_ALL_Rejection`));
    return sitedata;
}

//build object of scraped data
function handleObjects(object1,object2,author,league,partnerID,order,team1,team2,excerptObj){
    obj = {
        excerpt: excerptObj.excerpt,
        team1name:team1.teamName,
        team1PPG:team1.teamPPG,
        team2name:team2.teamName,
        team2PPG:team2.teamPPG,
        t1tag1: team1.tag1,
        t1tag2: team1.tag2,
        t1tag3: team1.tag3,
        t2tag1: team2.tag1,
        t2tag2: team2.tag2,
        t2tag3: team2.tag3,
        author: author,
        league: league,
        partnerID: partnerID,
        order: order,
        // time: object1.time,
        date: object1.date,
        where: object1.location,
        when: object1.when,
        first3Para: object1.first3Para,
        TV: object1.TVchannels,
        firstParaGraph: object1.firstParaGraph,
        recentForm: object2.recentFormTable,
        visitingTeam: object2.visitingTeam,
        homeTeam: object2.homeTeam,
        last5VisitingTable: object2.last5VisitingTable,
        last5HomeTable: object2.last5HomeTable,
        trendsVisiting: object2.trendsVisiting,
        trendsHome: object2.trendsHome,
        vs: object2.vs,
        homeTeamWinLose: object2.homeWinLose,
        visitingTeamWinLose: object2.visitingWinLose      
    }
    return obj;
}

//Scrape Source 1
function handleSource1(html) {
    const $ = cheerio.load(html,{normalizeWhitespace: true, decodeEntities: false});
    //initialized cheerio
    try {
        //Start Scraping
        let content = $('div.sdi-preview-content').html(); //get contents for filtering paragraph etc.
        // let FirstP = content.match(/(?<=<div class="sdi-byline">(.*)<\/div>\n)(.*)(?=<br>)/g).toString(); //gets all the elements before<br>
        let FirstP = content.match(/.+?(?=<br>)/gm).toString();
        let brArr = FirstP.split('<br>'); //split contents by <br>
        let quickhits = $('div.sdi-quickhits').children().html() //when where 
        let quickhitsArr= quickhits.split('\n'); //split when where
        let whenArr = quickhitsArr[1].match(/(?<=When:\s?<\/strong>).+?(?=<br>?)/gi,'').toString().split(',');
        //End Scraping
        //Begin Scraped Data
        let time = whenArr[0];
        let date = `${whenArr[1]},${whenArr[2]},${whenArr[3]}`;
        let FirstPara = brArr[0].toString(); //get the first paragraph from the p array
        // let tv = content.match(/(?<=TV:\s?<\/strong>).+?(?=<br>?)/gi).toString(); //Filter TV Channels from all the contents
        let location = quickhitsArr[2].match(/(?<=Where:\s?<\/strong>).+?(?=<br>?)/gi,'').toString(); //Gets the exact location without the html tags
        let first3Para = [];
        let statsTable = $('.sdi-preview-content p');
        statsTable.each(function(index) {
            if ( index === 0 || index === 2 || index === 4 ) {
            let title = $(this).prop('outerHTML');
            first3Para.push(title);
            }
        });
        first3Para = first3Para.join(',').toString();
        // build and send back object to handleObjects function
        let scrapedObject1 = {
            time: time,
            date: date,
            firstParaGraph: FirstPara,
            location: location,
            when: whenArr,
            first3Para: first3Para
        }
        return scrapedObject1;
    } catch (error) {
        let err_string = `Exact Error: ${error}`;
        let source = 'Scraping::ContentErr-SportsDirect > URL Doesn\'t Contain required data or there was a change in the website';
        errHandler(err_string,source);
    }
}

//Scrape Source 2
function handleSource2(html) {
    const $ = cheerio.load(html, {normalizeWhitespace: true, decodeEntities: false});
    //initialized cheerio
    try{
        //start teams
        teamArr = [];
        let teams = $('div.team').each(function(idx,elem){teamArr[idx] = $(this).text()}); //get all team related info and store them into array
        //end teams
        let visitingArr =  teamArr[0].split('\n');
        let homeArr = teamArr[1].split('\n');

        //start Tables
        let recent = $('table.matchup_recentform').html() //get the recent table
        let last5Arr = [];
        let last5 = $('.matchup_last5').each(function(i,e){last5Arr[i] = $(this).html()}); //get each last5 matchup and store them into array
        let trendsArr = [];
        let trends = $('table.trends').each(function(index,el){trendsArr[index] = $(this).html()}); //get each team's trends and store them into array
        let trendsHomeTableToFix = trendsArr[0].replace(/ class=".*(?<=")/g, '').replace(/\s\s/g, ''); //remove classes and whitespaces
        let trendsVisitingTableToFix = trendsArr[1].replace(/ class=".*(?<=")/g, '').replace(/\s\s/g, ''); //remove classes and whitespaces
        //end tables
    
        //start scraped data
        let VisitingTeamName = `${visitingArr[3]} ${visitingArr[4]}`.replace(/\s\s/g,''); //sample: Boise State Broncos
        let VisitingTeamWinLose = visitingArr[5].replace(/\s/g, ''); // sample: 19-11
        let HomeTeamName = `${homeArr[3]} ${homeArr[4]}`.replace(/\s\s/g,''); //sample: Boise State Broncos
        let HomeTeamWinLose = homeArr[5].replace(/\s/g, ''); // sample: 19-11
        let vs = `${VisitingTeamName} (${VisitingTeamWinLose}) vs ${HomeTeamName} (${HomeTeamWinLose})`;
        let recentFormTable = recent.replace(/ class=".*(?<=")/g, '').replace(/\s\s/g,''); // remove classes and whitespaces
        let last5HomeTable = last5Arr[0].replace(/ class=".*(?<=")/g, '').replace(/\s\s/g, ''); //remove classes and whitespaces
        let last5VisitingTable = last5Arr[1].replace(/ class=".*(?<=")/g, '').replace(/\s\s/g, ''); //remove classes and whitespaces
        let trendsVisitingTable = trendsVisitingTableToFix.replace(/<th>.*(?<=<\/th>)/g,`<th colspan="3"> <strong>${VisitingTeamName}</strong></th>`); //add strong tag in team name
        let trendsHomeTable = trendsHomeTableToFix.replace(/<th>.*(?<=<\/th>)/g,`<th colspan="3"> <strong>${HomeTeamName}</strong></th>`);//add strong tag in team name
        // end scraped data

        // build and send back object to handleObjects function
        let scrapedObject2 = {
            visitingTeam: VisitingTeamName,
            visitingWinLose: VisitingTeamWinLose,
            homeTeam: HomeTeamName,
            homeWinLose: HomeTeamWinLose,
            vs: vs,
            recentFormTable: recentFormTable,
            last5VisitingTable: last5VisitingTable,
            last5HomeTable: last5HomeTable,
            trendsVisiting: trendsVisitingTable,
            trendsHome: trendsHomeTable
        };
        return scrapedObject2;
    } catch(error){
        let err_string = `Exact Error: ${error}`;
        let source = 'Scraping::ContentErr-Bovada> URL Doesn\'t Contain required data or there was a change in the website'
        errHandler(err_string, source);
    }
}

//scrape Source 3
function handleSource3(html) {
    const $ = cheerio.load(html, {normalizeWhitespace: true, decodeEntities: false});
    //initialized cheerio
    try{
        let team1 = $('.sdi-data-wide tr:nth-child(2) td:first-child').text();
        let team2 = $('.sdi-data-wide tr:nth-child(2) td:last-child').text();

        let team2tag1 = $('.sdi-data-wide tr:nth-child(2) td:first-child').text();
        let team2tag2 = $('.sdi-data-wide tr:nth-child(3) td:first-child').text();
        let team2tag3 = $('.sdi-data-wide tr:nth-child(4) td:first-child').text();

        // build and send back object to handleObjects function
        let scrapedObject3 = {
            teamName: team1,
            teamPPG: team2,
            tag1: team2tag1,
            tag2: team2tag2,
            tag3: team2tag3
        };
        return scrapedObject3;
    } catch(error){
        let err_string = `Exact Error: ${error}`;
        let source = 'Scraping::ContentErr-Bovada> URL Doesn\'t Contain required data or there was a change in the website'
        errHandler(err_string, source);
    }
}

//scrape Source 4
function handleSource4(html) {
    const $ = cheerio.load(html, {normalizeWhitespace: true, decodeEntities: false});
    //initialized cheerio
    try{
        let team1 = $('.sdi-data-wide tr:nth-child(2) td:first-child').text();
        let team2 = $('.sdi-data-wide tr:nth-child(2) td:last-child').text();
        let team2tag1 = $('.sdi-data-wide tr:nth-child(2) td:first-child').text();
        let team2tag2 = $('.sdi-data-wide tr:nth-child(3) td:first-child').text();
        let team2tag3 = $('.sdi-data-wide tr:nth-child(4) td:first-child').text();

        // build and send back object to handleObjects function
        let scrapedObject4 = {
            teamName: team1,
            teamPPG: team2,
            tag1: team2tag1,
            tag2: team2tag2,
            tag3: team2tag3
        };
        return scrapedObject4;
    } catch(error){
        let err_string = `Exact Error: ${error}`;
        let source = 'Scraping::ContentErr-Bovada> URL Doesn\'t Contain required data or there was a change in the website'
        errHandler(err_string, source);
    }
}

//scrape Source 5
function handleSource5(html) {
    const $ = cheerio.load(html, {normalizeWhitespace: true, decodeEntities: false});
    //initialized cheerio
    try{
        let excerpt = $('.content p+p').prop('outerHTML');

        // build and send back object to handleObjects function
        let scrapedObject4 = {
            excerpt: excerpt
        };
        return scrapedObject4;
    } catch(error){
        let err_string = `Exact Error: ${error}`;
        let source = 'Scraping::excerpt-Bovada> URL Doesn\'t Contain required data or there was a change in the website'
        errHandler(err_string, source);
    }
}

//firebase stuff
// function startFirebase() {
//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//         databaseURL: "https://ognliveodds.firebaseio.com"
//     });
//     db = admin.firestore();
// }

//Save the template to FireStore
function savetoDB(wholeHTML,data) {
    if(!debug){ //only run when debug is false
        // saving array directly to document with date stamp as docID
        db.collection(`articles`).doc(`[${league}]_${exactmoment}`).set({ 
                HTMLCodes: wholeHTML,
                templateDate: yyyymmdd, // for query purposes
                publishingStatus: false, // true used and false new or vice versa...
                staffUID: null,
                order: `${order}`,
                league: `${league}`,
                gameTitle: `${data.vs}`
            })
            .then(function () {
                console.log(`- Inserted into db with docId: [${league}]_${exactmoment}`);
                // TODO: WE should report success somewhere
            })
            .catch(err => {
                let source = `FireBase Save To DB Failed`;
                errHandler(err,source);
            });
    }
}

//Error Handling Function
function errHandler(err, source){
    if(!debug){
        let report = {
            errorSource: `${source}`,
            errorMessage: `${err}`,
            date: exactmoment,
            script: `[${league}] app_scraper.js`,
          }
        let rand = Math.floor(Math.random() * 1000000000) //generate random number
        db.collection('error_reports').doc(`[${league}]_${exactmoment}_${rand}`).set(report).catch(err => console.log(err));
    }else{//if debugging is on print errors to console
        console.log(err,source);
    }
}



function authorName(id){
    let author = '';
    switch(id){
        case '1': author = 'LVSB Team';break;
        case '2': author = 'Liev Jackson';break;
        case '3': author = 'Aengus Moorehead';break;
        default: author = 'LVSB Team';
    }
    return author;
}
function leagueName(url){
    const nba = url.toLowerCase().includes('nba');
    const ncaab = url.toLowerCase().includes('ncaab');
    const nhl = url.toLowerCase().includes('nhl');
    let league = '';
    if(nba){
        league = 'NBA';
    }
    if(ncaab){
        league = 'NCAAB';
    }
    if(nhl){
        league = 'NHL';
    }
    return league;
}
function partnerid(author){
    let partnerID = '';
    if(author === 'LVSB Team'){
        partnerID = 20;
    }
    if(author === 'Liev Jackson'){
        partnerID = 41;
    }
    if(author === 'Aengus Moorehead'){
        partnerID = 40;
    }else{
        partnerID = 20;
    }
    return partnerID;
}
