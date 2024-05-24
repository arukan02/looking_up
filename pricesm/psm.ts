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

//get the filename from args
const args = process.argv.slice(2);
if(args.length < 1){
    console.error('please input csv filename as args');
    process.exit(1);
}
const csvFileName = args[0];
const csvFilePath = path.resolve(__dirname, csvFileName);
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
        const highestPrice = findOptimalPrice(percentages, 'tooExpensivePercentage', 'cheapPercentage');
        const compromisedPrice = findOptimalPrice(percentages, 'expensivePercentage', 'cheapPercentage');
        const idealPrice = findOptimalPrice(percentages, 'tooExpensivePercentage', 'tooCheapPercentage');
        const lowestQualityGuaranteedPrice = findOptimalPrice(percentages, 'expensivePercentage', 'tooCheapPercentage');

      
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

interface Percentages {
    price: number;
    expensivePercentage: number;
    cheapPercentage: number;
    tooExpensivePercentage: number;
    tooCheapPercentage: number;
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
function findOptimalPrice(percentages: Percentages[], key1: keyof Percentages, key2: keyof Percentages): number | null {
    let closestPrice = percentages[0].price;
    let smallestDifference = Math.abs((percentages[0][key1] as number) - (percentages[0][key2] as number));

    for (const percentage of percentages) {
        const difference = Math.abs((percentage[key1] as number) - (percentage[key2] as number));
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestPrice = percentage.price;
        }
    }

    const closestPrices = percentages.filter(percentage => 
        Math.abs((percentage[key1] as number) - (percentage[key2] as number)) === smallestDifference
    );

    if (closestPrices.length > 1) {
        const averagePrice = closestPrices.reduce((sum, percentage) => sum + percentage.price, 0) / closestPrices.length;
        return averagePrice;
    }

    return closestPrice;
}