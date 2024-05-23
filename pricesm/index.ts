import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import csv from 'csv-parser';

interface PriceData {
    sampleNumber: number;
    expensivePrice: number;
    cheapPrice: number;
    tooExpensivePrice: number;
    tooCheapPrice: number;
}

const csvFilePath = path.resolve(__dirname, 'PSMrawdata.csv');
const priceData: PriceData[] = [];

interface CsvRow {
    'sample number': string;
    '高い': string;
    '安い': string;
    '高すぎる': string;
    '安すぎる': string;
}

const readStream = fs.createReadStream(csvFilePath).pipe(iconv.decodeStream('utf-8'));

readStream.pipe(csv())
    .on('data', (data: CsvRow) => {
        const priceEntry: PriceData = {
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
function sortUniquePrice(data: PriceData[]): number[]{
    const uniquePriceSet = new Set<number>();
    
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

function calculatePricePercentages(data: PriceData[], uniquePrices: number[]): {price: number, expensivePercentage: number, cheapPercentage: number, tooExpensivePercentage: number, tooCheapPercentage: number} [] {
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
        return {price, expensivePercentage, cheapPercentage, tooExpensivePercentage, tooCheapPercentage};
    });
}

// Function to find the price where the percentage of expensivePrice and cheapPrice values are the same
function findHighestPrice(percentages: { price: number, tooExpensivePercentage: number, cheapPercentage: number }[]): number | null {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs(percentages[0].tooExpensivePercentage - percentages[0].cheapPercentage);

    for (const percentage of percentages) {
        const difference = Math.abs(percentage.tooExpensivePercentage - percentage.cheapPercentage);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }

    const closestPrices = percentages.filter(percentage => 
        Math.abs(percentage.tooExpensivePercentage - percentage.cheapPercentage) === smallestDifference
    );

    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }

    return closestPrice;
}

function findCompromisedPrice(percentages: { price: number, expensivePercentage: number, cheapPercentage: number }[]): number | null {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs(percentages[0].expensivePercentage - percentages[0].cheapPercentage);

    for (const percentage of percentages) {
        const difference = Math.abs(percentage.expensivePercentage - percentage.cheapPercentage);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }

    const closestPrices = percentages.filter(percentage => 
        Math.abs(percentage.expensivePercentage - percentage.cheapPercentage) === smallestDifference
    );

    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }

    return closestPrice;
}

function findIdealPrice(percentages: { price: number, tooExpensivePercentage: number, tooCheapPercentage: number }[]): number | null {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs(percentages[0].tooExpensivePercentage - percentages[0].tooCheapPercentage);

    for (const percentage of percentages) {
        const difference = Math.abs(percentage.tooExpensivePercentage - percentage.tooCheapPercentage);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }

    const closestPrices = percentages.filter(percentage => 
        Math.abs(percentage.tooExpensivePercentage - percentage.tooCheapPercentage) === smallestDifference
    );

    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }

    return closestPrice;
}

function findLowestQualityGuaranteedPrice(percentages: { price: number, expensivePercentage: number, tooCheapPercentage: number }[]): number | null {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs(percentages[0].expensivePercentage - percentages[0].tooCheapPercentage);

    for (const percentage of percentages) {
        const difference = Math.abs(percentage.expensivePercentage - percentage.tooCheapPercentage);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }

    const closestPrices = percentages.filter(percentage => 
        Math.abs(percentage.expensivePercentage - percentage.tooCheapPercentage) === smallestDifference
    );

    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }

    return closestPrice;
}
