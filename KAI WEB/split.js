const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const regex = /(<!-- VIEW 1: DASHBOARD -->[\s\S]*?<\/section>)\s*(<!-- VIEW 2: DATASET -->[\s\S]*?<\/section>)\s*(<!-- VIEW 3: HASIL PEMERIKSAAN -->[\s\S]*?<\/section>)\s*(<!-- VIEW 4: IMPORT TAMAN KERETA -->[\s\S]*?<\/section>)/;

const match = html.match(regex);
if (match) {
    fs.writeFileSync('public/pages/dashboard.html', match[1]);
    fs.writeFileSync('public/pages/dataset.html', match[2]);
    fs.writeFileSync('public/pages/hasil.html', match[3]);
    fs.writeFileSync('public/pages/taman_kereta.html', match[4]);

    const newHtml = html.replace(match[0], '<div id="views-container"></div>');
    fs.writeFileSync('public/index.html', newHtml);
    console.log("Files split successfully.");
} else {
    console.log("Failed to match views.");
}
