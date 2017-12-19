const request = require("tinyreq");
const cheerio = require("cheerio");
const fs = require('fs');
const parse = require('csv-parse');
const MTGCard = require("./MTGCard.js");
const jsonQuery = require('json-query');

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
                    let url = "https://www.mtggoldfish.com/price/" + setFullName;
                    if (isFoil === 'Yes') {
                        url += ":Foil"
                    }
                    url += "/" + cardName.replace(/ /g, "+").replace(/'/g, "");

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
     * web page for MTG sets, and creates a json file of their set name and their set
     * abbreviation.
     *
     * @returns {Promise<Array>}
     */
    createAbrToFullNameMappingJson(callback) {
        try {
            let file = fs.readFileSync('specialSetCases.json', 'utf8', function (err) {
                if (err) {
                    callback(null, "error while reading file");
                }
                else {
                    callback(null, "file read");
                }
            });
            let specialCasesJson = JSON.parse(file);
            let jsonArr = {}, key = "nameAbrevPair";
            jsonArr[key] = [];

            request("https://mtg.gamepedia.com/Template:List_of_Magic_sets", function (err, body) {
                let $ = cheerio.load(body);

                $(".wikitable tr").each(function () {
                    let fullName = "";
                    let abr = "";
                    $('td', this).each(function (index) {
                        if (index === 1) {
                            fullName = $(this).text().trim()
                        }
                        else if (index === 3) {
                            abr = $(this).text().trim()
                        }
                    });

                    if (fullName !== '' && abr !== '') {
                        let foundName = jsonQuery('nameAbrevPair[abr=' + abr + '].fullName', {
                            data: specialCasesJson
                        });
                        if (foundName.value !== null) {
                            fullName = foundName.value
                        }
                        else {
                            fullName = fullName.replace(/ *\([^)]*\) */g, "").trim()
                                .replace(/ /g, "+").replace(/'/g, "")
                                .replace(/:/g, "");
                        }
                        jsonArr[key].push({
                            abr: abr,
                            fullName: fullName
                        });
                    }
                });
                let wstream = fs.createWriteStream('mtgSetAbrToFullname.json');
                wstream.write(JSON.stringify(jsonArr));
                wstream.end();
            });
        }
        catch (ex) {
            callback(ex)
        }
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
                let cardJson = {}, key = "cards"; //0,1,4,6
                cardJson[key] = [];
                try {
                    fs.createReadStream(csvFilePath)
                        .pipe(parse({delimiter: ','}))
                        .on('data', function (csvrow) {
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
                        .on('end', function () {
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