import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import csv from 'csv-parser';

const csvFilePath = path.resolve(__dirname, 'PSMrawdata.csv');

interface CsvRow {
    [key: string]: string;
}

const results: CsvRow[] = [];

const readStream = fs.createReadStream(csvFilePath).pipe(iconv.decodeStream('utf-8'));

readStream.pipe(csv())
    .on('data', (data: CsvRow) => results.push(data))
    .on('end', () => {
        console.log('CSV file successfully processed: ');
        console.log(results);
    })
    .on('error', (err) => {
        console.error('Error reading the CSV file: ', err);
    }); 