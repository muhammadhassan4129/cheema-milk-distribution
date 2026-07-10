import fs from 'fs';

let content = fs.readFileSync('src/screens/accountant/SaleLedger.tsx', 'utf-8');

// Alignments to LTR standard
content = content.replace(/text-right/g, "text-left");
content = content.replace(/space-x-reverse/g, "");
content = content.replace(/justify-start/g, ""); 
content = content.replace(/justify-end/g, "");

// Remove the Opening Balance Override section entirely
content = content.replace(/\{\/\* Chronological Opening Balance Override Controls \*\/\}[\s\S]*?\{\/\* MONTHLY REPORT FILTER & SUMMARIES \*\/\}/, "{/* MONTHLY REPORT FILTER & SUMMARIES */}");

fs.writeFileSync('src/screens/accountant/SaleLedger.tsx', content, 'utf-8');
