const request = require("tinyreq");
const cheerio = require("cheerio");
const fs = require('fs');
const parse = require('csv-parse');
const jsonQuery = require('json-query');
const json2csv = require('json2csv');

module.exports = {

    /**
     * Method for getting a cards prices from MTG Goldfish
     *
     * @param card the card json object
     * @param setFullName the full set name
     */
    getCardFromMtgGoldfish(card, setFullName) {
        return new Promise(
            function (fulfill, reject) {
                try {
                    //Create the URL in format https://www.mtggoldfish.com/price/SET(:FOIL)/CARD
                    let url = "https://www.mtggoldfish.com/price/" + setFullName;
                    if (card.isFoil === 'Yes') {
                        url += ":Foil"
                    }
                    url += "/" + card.name.replace(/ /g, "+").replace(/'/g, "")
                        .replace(/,/g, "").replace(/\//g, "+");

                    //Go to the website and get the prices
                    request(url, function (err, body) {
                        let $ = cheerio.load(body);
                        let priceBoxDiv = $(".price-box-container").text().split("\n");

                        let divInfo = [];
                        priceBoxDiv.forEach(node => {
                            if (node !== '' && node !== "ONLINE" && node !== "PAPER") {
                                divInfo.push(node);
                            }
                        });

                        //Add card info to the json
                        card.onlinePrice = divInfo[0];
                        card.paperPrice = divInfo[1];
                        if(card.onlinePrice !== "") {
                            card.totalOnline = divInfo[0] * card.quantity;
                        }
                        if(card.paperPrice !== "") {
                            card.totalPaper = divInfo[1] * card.quantity;
                        }
                        console.log(card.name);
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
            let setToAbrPairsJson = [];

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

                    if (fullName !== "" && abr !== "") {
                        fullName = fullName.replace(/ *\([^)]*\) */g, "").trim()
                                .replace(/ /g, "+").replace(/'/g, "")
                                .replace(/:/g, "");
                        abr = abr.replace(/ *\([^)]*\) */g, "").trim();
                        setToAbrPairsJson.push({
                            abr: abr,
                            fullName: fullName
                        });
                    }
                });
                module.exports.addSpecialCases(setToAbrPairsJson, specialCasesJson);
                let wstream = fs.createWriteStream('mtgSetAbrToFullname.json');
                wstream.write(JSON.stringify(setToAbrPairsJson));
                wstream.end();
            });
        }
        catch (ex) {
            callback(ex)
        }
    },

    /**
     * This function takes in two json objects both consisting of
     * set-name to abbreviation pairs. It will iterate through the specialCasesJson
     * and then search the setToAbrPairsJson for each pair, if the pair is found
     * it is replaced with the special case, if it is not then the special case is added.
     * @param setToAbrPairsJson
     * @param specialCasesJson
     */
    addSpecialCases(setToAbrPairsJson, specialCasesJson)
    {
        specialCasesJson.map(function(pair){
            //Search Json for special case pair
            let foundPair = jsonQuery('[abr=' + pair.abr + ']', {
                data: setToAbrPairsJson
            });
            //If special case is found, replace it with special case values
            if(foundPair.value !== null)
            {
                console.log(foundPair.value);
                foundPair.value.fullName = pair.fullName
            }
            //If the special case is not found add it
            else
            {
                setToAbrPairsJson.push(pair)
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
    },

    cards2csv(cardsJson)
    {
        let fields = ['name', 'quantity', 'setAbr', 'isFoil',
            'onlinePrice', 'paperPrice', 'totalOnline', 'totalPaper'];
        /*cards json example= [
            {
                name: ,
                quantity: ,
                setAbr: ,
                isFoil: ,
                onlinePrice: ,
                paperPrice: ,
                totalOnline: ,
                totalPaper:
            }
        ];*/
        let csv = json2csv({ data: cardsJson, fields: fields });

        fs.writeFile('out.csv', csv, function(err) {
            if (err) throw err;
            console.log('file saved');
        });
    },

    /**
     * Delay between each call to MTG Goldfish of 2 seconds so that
     * they don't block the bot for spamming their servers
     *
     * @param card the card json
     * @param index the number of the iteration
     * @param jsonOfSets json of the set to abbreviation pairs
     * @returns {Promise<any>}
     */
    timeBasedCardSearch(card, index, jsonOfSets) {
        return new Promise(
            function (fulfill, reject) {
                try {
                    setTimeout(function () {
                        let result = jsonQuery('[abr=' + card.setAbr + '].fullName', {
                            data: jsonOfSets
                        });
                        fulfill(module.exports.getCardFromMtgGoldfish(card, result.value))
                    }, 2000 * index)
                }
                catch (ex) {
                    reject(ex)
                }
            })

    }
};