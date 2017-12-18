/*
 * A class to define a magic card.
 * Holds the name of a card, the set abbreviation, the full set name,
 * and the price for the card online and IRL according to MTG Goldfish
 *
 */
module.exports = class MTGCard
{
    constructor(name, setAbr, setFull, onlinePrice, paperPrice)
    {
        this._name = name;
        this._setAbr = setAbr;
        this._setFull = setFull;
        this._onlinePrice = onlinePrice;
        this._paperPrice = paperPrice;
    }

    toString()
    {
        return "Card Name: " + this._name + "\n" +
            "Set Abr: " + this._setAbr + "\n" +
            "Set full: " + this._setFull + "\n" +
            "Online Price: " + this._onlinePrice + "\n" +
            "Paper Price: " + this._paperPrice;
    }

    //getters and setters
    get paperPrice() {
        return this._paperPrice;
    }

    set paperPrice(value) {
        this._paperPrice = value;
    }
    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }
    get setAbr() {
        return this._setAbr;
    }

    set setAbr(value) {
        this._setAbr = value;
    }
    get setFull() {
        return this._setFull;
    }

    set setFull(value) {
        this._setFull = value;
    }

    get onlinePrice() {
        return this._onlinePrice;
    }

    set onlinePrice(value) {
        this._onlinePrice = value;
    }

};