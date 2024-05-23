"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const iconv = __importStar(require("iconv-lite"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const csvFilePath = path.resolve(__dirname, 'PSMrawdata.csv');
const priceData = [];
const readStream = fs.createReadStream(csvFilePath).pipe(iconv.decodeStream('utf-8'));
readStream.pipe((0, csv_parser_1.default)())
    .on('data', (data) => {
    const priceEntry = {
        sampleNumber: parseInt(data["sample number"]),
        expensivePrice: parseFloat(data["高い"]),
        cheapPrice: parseFloat(data["安い"]),
        tooExpensivePrice: parseFloat(data["高すぎる"]),
        tooCheapPrice: parseFloat(data["安すぎる"])
    };
    priceData.push(priceEntry);
})
    .on('end', () => {
    //make an array of unique prices
    const uniquePrices = sortUniquePrice(priceData);
    // Calculate percentage of expensivePrice and cheapPrice values lower than or equal to each unique price
    const percentages = calculatePricePercentages(priceData, uniquePrices);
    // Find the price where the percentage of tooExpensivePrice and cheapPrice values are the same
    const highestPrice = findHighestPrice(percentages);
    const compromisedPrice = findCompromisedPrice(percentages);
    const idealPrice = findIdealPrice(percentages);
    const lowestQualityGuaranteedPrice = findLowestQualityGuaranteedPrice(percentages);
    console.log('最高価格', highestPrice, '円');
    console.log('妥協価格', compromisedPrice, '円');
    console.log('理想価格', idealPrice, '円');
    console.log('最低品質保証価格', lowestQualityGuaranteedPrice, '円');
})
    .on('error', (err) => {
    console.error('Error reading the CSV file: ', err);
});
//function to make an array of sorted unique price
function sortUniquePrice(data) {
    const uniquePriceSet = new Set();
    //iterate every price point
    data.forEach(entry => {
        uniquePriceSet.add(entry.expensivePrice);
        uniquePriceSet.add(entry.cheapPrice);
        uniquePriceSet.add(entry.tooExpensivePrice);
        uniquePriceSet.add(entry.tooCheapPrice);
    });
    //convert set to array and sort
    return Array.from(uniquePriceSet).sort((a, b) => a - b);
}
function calculatePricePercentages(data, uniquePrices) {
    //calculate cumulative percentage
    const n = data.length;
    return uniquePrices.map(price => {
        const expensiveCount = data.filter(entry => entry.expensivePrice <= price).length;
        const expensivePercentage = (expensiveCount / n) * 100;
        const cheapCount = data.filter(entry => entry.cheapPrice >= price).length;
        const cheapPercentage = (cheapCount / n) * 100;
        const tooExpensiveCount = data.filter(entry => entry.tooExpensivePrice <= price).length;
        const tooExpensivePercentage = (tooExpensiveCount / n) * 100;
        const tooCheapCount = data.filter(entry => entry.tooCheapPrice >= price).length;
        const tooCheapPercentage = (tooCheapCount / n) * 100;
        return { price, expensivePercentage, cheapPercentage, tooExpensivePercentage, tooCheapPercentage };
    });
}
// Function to find the price where the percentage of expensivePrice and cheapPrice values are the same
function findHighestPrice(percentages) {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs(percentages[0].tooExpensivePercentage - percentages[0].cheapPercentage);
    for (const percentage of percentages) {
        const difference = Math.abs(percentage.tooExpensivePercentage - percentage.cheapPercentage);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }
    const closestPrices = percentages.filter(percentage => Math.abs(percentage.tooExpensivePercentage - percentage.cheapPercentage) === smallestDifference);
    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }
    return closestPrice;
}
function findCompromisedPrice(percentages) {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs(percentages[0].expensivePercentage - percentages[0].cheapPercentage);
    for (const percentage of percentages) {
        const difference = Math.abs(percentage.expensivePercentage - percentage.cheapPercentage);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }
    const closestPrices = percentages.filter(percentage => Math.abs(percentage.expensivePercentage - percentage.cheapPercentage) === smallestDifference);
    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }
    return closestPrice;
}
function findIdealPrice(percentages) {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs(percentages[0].tooExpensivePercentage - percentages[0].tooCheapPercentage);
    for (const percentage of percentages) {
        const difference = Math.abs(percentage.tooExpensivePercentage - percentage.tooCheapPercentage);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }
    const closestPrices = percentages.filter(percentage => Math.abs(percentage.tooExpensivePercentage - percentage.tooCheapPercentage) === smallestDifference);
    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }
    return closestPrice;
}
function findLowestQualityGuaranteedPrice(percentages) {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs(percentages[0].expensivePercentage - percentages[0].tooCheapPercentage);
    for (const percentage of percentages) {
        const difference = Math.abs(percentage.expensivePercentage - percentage.tooCheapPercentage);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }
    const closestPrices = percentages.filter(percentage => Math.abs(percentage.expensivePercentage - percentage.tooCheapPercentage) === smallestDifference);
    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }
    return closestPrice;
}
