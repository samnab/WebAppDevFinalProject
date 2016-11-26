// Test this by activating mongodb, running this file, and then checking http://localhost:8081/sample in the browser.
var mongodb = require('mongodb');
var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
var app     = express();
var numclasses = 0;

function getTimeBit(time){
    //Returns the bit set for time.
    var shifts = -14; //Doors open at 7:00. Therefore, a time of 7:00 will represent 0 shifts.
    if (time.indexOf("pm") != -1) {
        shifts += 24; //If in the evening, shift 12 more hours (24 places).
    }
    if (time.indexOf("30") != -1 || time.indexOf("40") != -1) {
        shifts += 1; //If on the half-hour, shift by 1.
    }
    var hours = parseInt(time.split(":")[0]);
    if (hours != 12) shifts += hours * 2; // skip 12:00, for obvious reasons
    return shifts;
}

function getDurationBits(starttime,endtime){
    var shifts = [];
    //Returns the bits set for a duration (as an array).
    var firstshifts = -14; //As per binarifyTime, but for the first number only - and without actually doing the shifting.
    if (starttime.indexOf("pm") != -1) {
        firstshifts += 24;
    }
    if (starttime.indexOf("30") != -1 || starttime.indexOf("40") != -1) {
        firstshifts += 1;
    }
    var hours = parseInt(starttime.split(":")[0]);
    if (hours != 12) firstshifts += hours * 2;

    var lastshifts = -14; //Now we do this again, for the end time.
    if (endtime.indexOf("pm") != -1) {
        lastshifts += 24;
    }
    if (endtime.indexOf("30") != -1 || endtime.indexOf("40") != -1) {
        lastshifts += 1;
    }

    hours = parseInt(endtime.split(":")[0]);
    if (hours != 12) lastshifts += hours * 2;
    var number = 0;
    for (var i = firstshifts; i <= lastshifts; i++){
        shifts.push(i); //create an array of all the flagged bits
    }
    return shifts;
}

function binarifyTime(time){
    //Returns the binary representation of a time.
    var shifts = -14; //Doors open at 7:00. Therefore, a time of 7:00 will represent 0 shifts.
    if (time.indexOf("pm") != -1) {
        shifts += 24; //If in the evening, shift 12 more hours (24 places).
    }
    if (time.indexOf("30") != -1 || time.indexOf("40") != -1) {
        shifts += 1; //If on the half-hour, shift by 1.
    }
    var hours = parseInt(time.split(":")[0]);
    if (hours != 12) shifts += hours * 2; // skip 12:00, for obvious reasons
    var number = 1 << shifts;
    return number;
}
function binarifyDuration(starttime,endtime){
    //Returns the binary representation of a duration.
    var firstshifts = -14; //As per binarifyTime, but for the first number only - and without actually doing the shifting.
    if (starttime.indexOf("pm") != -1) {
        firstshifts += 24;
    }
    if (starttime.indexOf("30") != -1 || starttime.indexOf("40") != -1) {
        firstshifts += 1;
    }
    var hours = parseInt(starttime.split(":")[0]);
    if (hours != 12) firstshifts += hours * 2;

    var lastshifts = -14; //Now we do this again, for the end time.
    if (endtime.indexOf("pm") != -1) {
        lastshifts += 24;
    }
    if (endtime.indexOf("30") != -1 || endtime.indexOf("40") != -1) {
        lastshifts += 1;
    }

    hours = parseInt(endtime.split(":")[0]);
    if (hours != 12) lastshifts += hours * 2;
    var number = 0;
    for (var i = firstshifts; i <= lastshifts; i++){
        number += (1 << i); //sum all the numbers between the start and end time, inclusive
    }
    return number;
}

app.get('/sample', function(req, res){
    // Placeholder URL for now.

    page_url = 'http://www.imdb.com/title/tt1229340/';

    // The structure of our request call
    // The first parameter is our URL
    // The callback function takes 3 parameters, an error, response status code and the html

    request(page_url, function(error, response, html){

        // First we'll check to make sure no errors occurred when making the request

        if(!error){
            //var $ = cheerio.load(html);
            var $ = cheerio.load(fs.readFileSync('login.html'));
            var lastclass = "ERROR";
            var lasttime = "ERROR";
            var lastday = "ERROR";
            var lastroom = "ERROR";

            //We need to work with "MongoClient" interface in order to connect to a mongodb server.
            var MongoClient = mongodb.MongoClient;
            // Connection URL. This is where your mongodb server is running.

            var Server = mongodb.Server, database = mongodb.Db, BSON = mongodb.BSONPure;
            var server = new Server('localhost', 27017, {auto_reconnect: true});
            db = new database('coursedb', server);

            db.open(function(err,db){
                if (!err) {
                    console.log("Connected to 'coursedb' database");
                    db.collection('courses', {strict: true}, function(err, collection) {
                        if (err) {
                            console.log("The 'courses' collection doesn't exist. Creating it with sample data...");
                        }
                        else {
                            db.collection('courses').remove({});
                            db.collection('rooms').remove({});
                        }

                        //parse the collection
                        if($("table.bordertable").find("tr").length == 0){
                            console.log("ERROR: Length of the loaded document found to be 0. Something weird's going on!")
                        }
                        var i = 0;
                        $("table.bordertable").find("tr").each(function(){
                            var cols = $(this).find("td.dbdefault");
                            if (cols.length == 18){

                                // Only get the class listings - that is, items with 18 column entries. (A bit of a cheat, but hey.)
                                if($(cols[2]).text() != "\xa0" && $(cols[3]).text() != "\xa0"){
                                    // If there's new class info, update it.
                                    lastclass = $(cols[2]).text() + " " + $(cols[3]).text();
                                }
                                if($(cols[9]).text() != "\xa0"){
                                    // If there's new day info, update it.
                                    lastday = $(cols[9]).text();
                                }
                                if($(cols[10]).text() != "\xa0"){
                                    // If there's new time info, update it.
                                    lasttime = $(cols[10]).text();
                                }
                                if($(cols[16]).text() != "\xa0"){
                                    // If there's new room info, update it... but this one's a bit more complex.
                                    if($(cols[16]).text() != "TBA"){
                                        if($($(cols[16]).children("br").get(1).nextSibling).text() != ""){
                                            //If there's more than one BR element, get what's after the second one.
                                            lastroom = $($(cols[16]).children("br").get(1).nextSibling).text();
                                        } else {
                                            //If there's one BR element, get what's after the first one.
                                            lastroom = $($(cols[16]).children("br").get(0).nextSibling).text();
                                        }
                                    } else {
                                        //If the room is TBD, just copy the full thing.
                                        lastroom = $(cols[16]).text();
                                    }
                                }
                                var bindur = 0;
                                if(lasttime != "TBA"){
                                    var times = lasttime.split("-");
                                    bindur = binarifyDuration(times[0],times[1]);
                                    //console.log(times[0] + " " + times[1] + ": " + bindur);
                                    db.collection("courses").save( {
                                        "class" : lastclass,
                                        "day" : lastday,
                                        "times" : lasttime,
                                        "binarytimes" : bindur,
                                        "room" : lastroom
                                    });
                                    numclasses++; //Increment number of classes.
                                    db.collection("rooms").update({"room" : lastroom, "day" : lastday},
                                        {$bit : {"times" : { or : bindur}}},
                                        {"new":true, "upsert":true}
                                    );
                                };
                            }
                        });
                        //Close connection
                        db.close();
                        console.log("Connection closed.");
                    });
                }
            });
            console.log(numclasses);
            res.send('Check your console! And your database!');
        }
    })
});

app.listen('8081')
console.log('Connected on port 8081.');
exports = module.exports = app;
