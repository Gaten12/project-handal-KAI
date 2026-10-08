const fs = require('fs');
const path = '../SiparkaApp/lib/screens/preview_laporan_screen.dart';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /final fileName = 'Hasil Pemeriksaan \(\$dateStr\)\.siparka';/,
  `final fileName = 'Hasil Pemeriksaan ($dateStr).spk';`
);

fs.writeFileSync(path, content, 'utf8');
console.log('preview_laporan_screen.dart updated successfully');
