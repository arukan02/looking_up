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

//to get the header
interface CsvRow {
    'sample number': string;
    '高い': string;
    '安い': string;
    '高すぎる': string;
    '安すぎる': string;
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

//to read the japanese characters
const readStream = fs.createReadStream(csvFilePath).pipe(iconv.decodeStream('utf-8'));

readStream.pipe(csv())
    .on('data', (data: CsvRow) => {
        //make a new set
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
        const uniquePrices = sortMultipleofFifty(priceData);

        // Calculate percentage of each unique price compared to price data range
        const percentages = calculatePricePercentages(priceData, uniquePrices);

        // Find the price of each PSM
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

//function to make an array of sorted price
function sortMultipleofFifty(data: PriceData[]): number[]{
    // Find the maximum price in the dataset
    let maxPrice = 0;
    
    data.forEach(entry => {
        maxPrice = Math.max(maxPrice, entry.expensivePrice, entry.cheapPrice, entry.tooExpensivePrice, entry.tooCheapPrice);
    });

    // Create an array of prices in multiples of 50 up to the maximum price
    const prices: number[] = [];
    for (let price = 50; price <= maxPrice; price += 50) {
        prices.push(price);
    }

    return prices;
}

//used interface to give clear structure for calculatePricePercentages function
interface Percentages {
    price: number;
    expensivePercentage: number;
    cheapPercentage: number;
    tooExpensivePercentage: number;
    tooCheapPercentage: number;
}

//calculate percentage of each data range
function calculatePricePercentages(data: PriceData[], uniquePrices: number[]): {price: number, expensivePercentage: number, cheapPercentage: number, tooExpensivePercentage: number, tooCheapPercentage: number} [] {
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

// Function to find the price where the percentage of two price values are the same
function findOptimalPrice(percentages: Percentages[], key1: keyof Percentages, key2: keyof Percentages): number | null {
    // Calculate the differences and sort by price
    const sortedPercentages = percentages
        .map(p => ({ ...p, difference: p[key1] - p[key2] }))
        .sort((a, b) => a.price - b.price);

    // Check if there's any entry with a difference of zero
    for (const p of sortedPercentages) {
        if (p.difference === 0) {
            return p.price;
        }
    }

    // Get the two closest points
    let closestPrices = sortedPercentages.slice(0, 2);

    // Find the first instance where the difference changes from negative to positive
    for (let i = 0; i < sortedPercentages.length - 1; i++) {
        if (sortedPercentages[i].difference < 0 && sortedPercentages[i + 1].difference > 0) {
            closestPrices = [sortedPercentages[i], sortedPercentages[i + 1]];
            break;
        }
    }

    //debugging
    // console.log('Two closest percentages:');
    // console.log(`Price 1: ${closestPrices[0].price}, ${key1}: ${closestPrices[0][key1]}, ${key2}: ${closestPrices[0][key2]}, Difference: ${closestPrices[0].difference}`);
    // console.log(`Price 2: ${closestPrices[1].price}, ${key1}: ${closestPrices[1][key1]}, ${key2}: ${closestPrices[1][key2]}, Difference: ${closestPrices[1].difference}`);

    const p1 = closestPrices[0]; //x1 = x3 = p1.price, y1 = p1[key1], y3 = p1[key2]
    const p2 = closestPrices[1]; //x2 = x4 = p2.price, y2 = p2[key1], y4 = p2[key2]

    // simplify the equation
    const x = (p1.price - p2.price); // x1 - x2 = x3 - x4 = p1.price - p2.price

    // Find intersection
    const intersectionPrice = (((p1[key2] - p1[key1]) * x * x) + (p1.price * (p1[key1] - p2[key1]) * x) - (p1.price * (p1[key2] - p2[key2]) * x))
     / (((p1[key1] - p2[key1]) * x) - (x * (p1[key2] - p2[key2])));

     //round up the price
    return Math.ceil(intersectionPrice);
}
