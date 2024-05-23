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
        const highestPrice = calculateHighestPrice(priceData, uniquePrices);

        // Calculate percentage of expensivePrice and cheapPrice values lower than or equal to each unique price
        const percentages = calculatePricePercentages(priceData, uniquePrices);


        const compromisedPrice = calculateCompromisedPrice(priceData);
        const idealPrice = calculateIdealPrice(priceData);
        const lowestQualityGuaranteedPrice = calculateLowestQualityGuaranteedPrice(priceData);

        console.log('最高価格', highestPrice, '円');        
        console.log('最高価格', highestPrice, '円');
        console.log('妥協価格', compromisedPrice, '円');
        console.log('理想価格', idealPrice, '円');
        console.log('最低品質保証価格', lowestQualityGuaranteedPrice, '円');

         // Find the price where the percentage of expensivePrice and cheapPrice values are the same
         const equalPercentagePrice = findEqualPercentagePrice(percentages);

         // Output the result
         console.log('Equal Percentage Price:', equalPercentagePrice);
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
function calculatePricePercentages(data: PriceData[], uniquePrices: number[]): {price: number, expensivePercentage: number, cheapPercentage: number} [] {
    //calculate cumulative percentage
    const n = data.length;
    return uniquePrices.map(price => {
        const expensiveCount = data.filter(entry => entry.expensivePrice <= price).length;
        const expensivePercentage = (expensiveCount / n) * 100;

        const cheapCount = data.filter(entry => entry.cheapPrice >= price).length;
        const cheapPercentage = (cheapCount / n) * 100;
        return {price, expensivePercentage, cheapPercentage};
    });
}

// Function to find the price where the percentage of expensivePrice and cheapPrice values are the same
function findEqualPercentagePrice(percentages: { price: number, expensivePercentage: number, cheapPercentage: number }[]): number | null {
    for (const percentage of percentages) {
        if (percentage.expensivePercentage === percentage.cheapPercentage) {
            return percentage.price;
        }
    }
    return null; // If no such price is found
}

function calculateHighestPrice(data: PriceData[], uniquePrices: number[]): number {
    return 1;
}

function calculateCompromisedPrice(data: PriceData[]): number {
    return 2;
}

function calculateIdealPrice(data: PriceData[]): number {
    return 3;
}

function calculateLowestQualityGuaranteedPrice(data: PriceData[]): number {
    return 4;
}


/*「高すぎて買えない」と「安いと思う」の交点 →「最高価格」
「高いと思う」と「安いと思う」の交点 →「妥協価格」
「高すぎて買えない」と「安すぎて買わない」の交点→「理想価格」
「高いと思う」と「安すぎて買わない」の交点 →「最低品質保証価格」*/

//i need to calculate the percentage of each price range (too cheap, cheap, expensive, too expensive)
//i need to find the price where
//1. too expensive and cheap cross (highest price / marginal exxpensiveness)
//2. expensive and cheap cross (compromise price / acceptable pricing)
//3. too expensive and too cheap cross (ideal price / optimal price point)
//4. expensive and too cheap cross ()
//cross means the percentage are the same for the 2 prices

//read all data, and make the percentage for each price
//for the expensive, find the percentage of prices below the current pointer
//for the cheap, find the percentage of prices above the current pointer
