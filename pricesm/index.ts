import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import csv from 'csv-parser';

interface PriceData {
    sampleNumber: number;
    expensivePrice: number;
    tooExpensivePrice: number;
    cheapPrice: number;
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
        const highestPrice = calculateHighestPrice(priceData);
        const compromisedPrice = calculateCompromisedPrice(priceData);
        const idealPrice = calculateIdealPrice(priceData);
        const lowestQualityGuaranteedPrice = calculateLowestQualityGuaranteedPrice(priceData);

        console.log('最高価格', highestPrice, '円');
        console.log('妥協価格', compromisedPrice, '円');
        console.log('理想価格', idealPrice, '円');
        console.log('最低品質保証価格', lowestQualityGuaranteedPrice, '円');
    })
    .on('error', (err) => {
        console.error('Error reading the CSV file: ', err);
    }); 

    //takes an array of PriceData objects as input and returns a number
function calculateHighestPrice(data: PriceData[]): number {
    //sort data by price by ascending order
    const sortedData = data.sort((a, b) => a.tooExpensivePrice - b.tooExpensivePrice);

    //calculate cumulative percentage
    const n = sortedData.length;
    const tooExpensivePercentages = sortedData.map((entry, index) => ({
        price: entry.tooExpensivePrice,
        percentage: (index + 1) / n * 100
    }));

    const sortedDataByCheap = [...sortedData].sort((a, b) => b.cheapPrice - a.cheapPrice);
    const cheapPercentages = sortedDataByCheap.map((entry, index) => ({
        price: entry.cheapPrice,
        percentage: (index + 1) / n * 100
    }));

    //find the intersection
    let intersectionPrice = 0;
    for (let i = 0; i < tooExpensivePercentages.length - 1; i++) {
        if (tooExpensivePercentages[i].percentage >= cheapPercentages[i].percentage) {
            intersectionPrice = (tooExpensivePercentages[i].price + cheapPercentages[i].price) / 2;
            break;
        }
    }
    return intersectionPrice;
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
