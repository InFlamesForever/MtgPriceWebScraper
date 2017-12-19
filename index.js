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

if (file !== undefined) {
    let jsonOfSets = JSON.parse(file);
    functions.getCardsJsonFromCSV("InFlamesForeverCollection.csv").then(function (jsonOfCsv) {
        jsonOfCsv.cards.forEach(function (card, index) {
            if (card.name === 'Mountain' || card.name === 'Island' || card.name === 'Plains'
                || card.name === 'Swamp' || card.name === 'Forest') {
                console.log("Skipping: " + card.name)
            }
            else {
                setTimeout(function () {
                    let result = jsonQuery('nameAbrevPair[abr=' + card.setAbr + '].fullName', {
                        data: jsonOfSets
                    });
                    functions.getCardFromMtgGoldfish(card.name, card.setAbr, result.value, card.isFoil)
                        .then(function (card) {
                            console.log(card.toString())
                        });
                }, 2000 * index)
            }
        })
    });
}
