const functions = require("./functions.js");
const jsonQuery = require('json-query');
const fs = require('fs');


let file = undefined;
try {
    file = fs.readFileSync('mtgSetAbrToFullname.json', 'utf8', function (err) {
        if (err) {
            callback(null, "error while reading file");
        }
        else {
            callback(null, "file read");
        }
    })
}
catch (ex) {
    functions.createAbrToFullNameMappingJson(function (err) {
        if (err) {
            callback(null, "error while creating mapping file");
        }
        else {
            callback(null, "mapping file created");
        }
    });
}

async function test() {

    if (file !== undefined) {
        let jsonOfSets = JSON.parse(file);

        let jsonOfCsv;
        jsonOfCsv = await functions.getCardsJsonFromCSV("InFlamesForeverCollection.csv");


        if (jsonOfCsv !== undefined) {
            //used Promise.all so that we can continue only when all of the cards have been processed
            return Promise.all(jsonOfCsv.cards.map(function (card, index) {
                return new Promise(
                    function (fulfill, reject) {
                        try {
                            if (card.name === 'Mountain' || card.name === 'Island' || card.name === 'Plains'
                                || card.name === 'Swamp' || card.name === 'Forest') {
                                console.log("Skipping: " + card.name)
                            }
                            else {
                                fulfill(functions.timeBasedCardSearch(card, index, jsonOfSets))
                            }
                        }
                        catch (ex)
                        {
                            reject(ex)
                        }
                    })
            })).then(function (x) {
                return x
            }).catch(function (err) {
                console.log(err)
            });
        }
    }

}
test().then(function (x) {
    let outputJson = [{}];
    x.forEach(card =>{
        outputJson.push(card)
    });
    functions.cards2csv(outputJson)
});
