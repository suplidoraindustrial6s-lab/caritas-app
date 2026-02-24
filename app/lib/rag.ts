import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');

const DOCS_DIR = path.join(process.cwd());

export async function getDocumentContext(fileName: string) {
    try {
        const filePath = path.join(DOCS_DIR, fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return '';
        }

        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        console.error('Error reading PDF:', error);
        return '';
    }
}
