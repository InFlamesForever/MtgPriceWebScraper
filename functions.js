const request = require("tinyreq");
const cheerio = require("cheerio");
let fs = require('fs');
let parse = require('csv-parse');
const MTGCard = require("./MTGCard.js");

module.exports = {

    /**
     * Method for getting a cards prices from MTG Goldfish
     *
     * @param cardName the full card name
     * @param setAbr the abbreviated set name
     * @param setFullName the full set name
     * @param isFoil whether the card you're looking up is foil or not
     */
    getCardFromMtgGoldfish(cardName, setAbr, setFullName, isFoil) {
        return new Promise(
            function (fulfill, reject) {
                try {
                    let url = "https://www.mtggoldfish.com/price/" + setFullName.replace(/ /g, "+");
                    if (isFoil) {
                        url += ":Foil"
                    }
                    url += "/" + cardName.replace(/ /g, "+");

                    request(url, function (err, body) {
                        let $ = cheerio.load(body);
                        let priceBoxDiv = $(".price-box-container").text().split("\n");

                        let divInfo = [];
                        priceBoxDiv.forEach(node => {
                            if (node !== '' && node !== "ONLINE" && node !== "PAPER") {
                                divInfo.push(node);
                            }
                        });

                        let card = new MTGCard(cardName, setAbr, setFullName, divInfo[0], divInfo[1]);
                        fulfill(card);
                    })
                }
                catch (ex) {
                    reject(ex)
                }
            })

    },

    /**
     * This function scrapes the https://mtg.gamepedia.com/Template:List_of_Magic_sets
     * web page for MTG sets, and creates a json array of their set name and their set
     * abbreviation.
     *
     * @returns {Promise<Array>}
     */
    getFullSetJson() {
        return new Promise(
            function (fulfill, reject) {
                let jsonArr = {}, key = "Name Abr Pair";
                jsonArr[key] = [];
                try {
                    request("https://mtg.gamepedia.com/Template:List_of_Magic_sets", function (err, body) {
                        let $ = cheerio.load(body);

                        $(".wikitable tr").each(function (index, value) {
                            let fullName = "";
                            let abr = "";
                            $('td', this).each(function (index, value) {
                                if (index === 1) {
                                    fullName = $(this).text().trim()
                                }
                                else if (index === 3) {
                                    abr = $(this).text().trim()
                                }
                            });
                            jsonArr[key].push({
                                abr: abr,
                                fullName: fullName
                            });
                        });
                        fulfill(jsonArr);
                    });
                }
                catch (ex) {
                    reject(ex)
                }
            })
    },

    /**
     * This function takes in the file path to a csv output from MTGO
     * and converts it into a json array
     *
     * @returns {Promise<Array>}
     */
    getCardsJsonFromCSV(csvFilePath) {
        return new Promise(
            function (fulfill, reject) {
                let cardJson = {}, key = "Cards"; //0,1,4,6
                cardJson[key] = [];
                try {
                    fs.createReadStream(csvFilePath)
                        .pipe(parse({delimiter: ','}))
                        .on('data', function(csvrow) {
                            cardJson[key].push({
                                name: csvrow[0],
                                quantity: csvrow[1],
                                setAbr: csvrow[4],
                                isFoil: csvrow[6],
                                onlinePrice: 0,
                                paperPrice: 0,
                                totalOnline: 0,
                                totalPaper: 0
                            });
                        })
                        .on('end',function() {
                            //do something with csvData
                            fulfill(cardJson)
                        });
                }
                catch (ex) {
                    reject(ex)
                }
            })
    }
};