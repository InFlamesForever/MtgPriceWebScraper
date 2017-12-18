const request = require("tinyreq");
const cheerio = require("cheerio");
const functions = require("./functions.js");

functions.getFullSetJson().then(function(jsonOfSets)
{

});
functions.getCardFromMtgGoldfish("Karn Liberated", "MM2", "Modern Masters 2015", true)
    .then(function(card) {
        console.log(card.toString())
    });