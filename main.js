// Test this by activating mongodb, running this file, and then checking http://localhost:8081/sample in the browser.
var mongodb = require('mongodb');
var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();
var numclasses = 0;

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
            var finaldiv = "<ul>";
            
            //We need to work with "MongoClient" interface in order to connect to a mongodb server.
            var MongoClient = mongodb.MongoClient;
            // Connection URL. This is where your mongodb server is running.
            var db_url = 'mongodb://localhost:27017/my_database_name';
            MongoClient.connect(db_url, function (err, db) {
                if (err) {
                    console.log('Unable to connect to the mongoDB server. Error:', err);
                } else {
                    //Connection succeeded.
                    console.log('Connection established to', db_url,"\n");

                    // do some work here with the database.

                    
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
                            //finaldiv += "<li>" + lastclass + ": " + lastday + " " + lasttime + " (" + lastroom + ")" + "</li>";
                            //console.log(finaldiv += "<li>" + lastclass + ": " + lastday + " " + lasttime + " (" + lastroom + ")" + "</li>");
                            console.log(lastclass + "\n");
                            numclasses++; //Increment number of classes.
                        }
                    });
                    //Close connection
                    db.close();
                    console.log("Connection closed.");
                }
            });
            console.log(numclasses);
            finaldiv += "</ul>";
            res.send('Check your console! And your database!');
        }
    })
});

app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;