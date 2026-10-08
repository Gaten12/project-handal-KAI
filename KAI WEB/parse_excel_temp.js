const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'Laporan Harian tgl 07 Agt 2026.xlsx');
const workbook = XLSX.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const firstSheet = workbook.Sheets[sheetName];

console.log(`=== SHEET: "${sheetName}" ===`);
console.log(`Range: ${firstSheet['!ref']}`);

const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
console.log(`Total rows: ${data.length}`);

// Print only first 25 rows but show all columns
for (let i = 0; i < Math.min(data.length, 25); i++) {
  const row = data[i];
  // Trim trailing empty values for readability
  let lastNonEmpty = -1;
  for (let j = row.length - 1; j >= 0; j--) {
    if (row[j] !== '' && row[j] !== null && row[j] !== undefined) {
      lastNonEmpty = j;
      break;
    }
  }
  const trimmed = row.slice(0, lastNonEmpty + 1);
  console.log(`Row ${i}: ${JSON.stringify(trimmed)}`);
}

// Get merges
if (firstSheet['!merges']) {
  console.log(`\nMerged cells (first 50):`);
  firstSheet['!merges'].slice(0, 50).forEach(m => {
    console.log(`  ${XLSX.utils.encode_range(m)}`);
  });
}
