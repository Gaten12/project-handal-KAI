const fs = require('fs');
const path = '../SiparkaApp/lib/screens/home_screen.dart';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /allowedExtensions:\s*\['siparka'\],/,
  `allowedExtensions: ['st', 'spk'],`
);

content = content.replace(
  /dialogTitle:\s*'Pilih File Laporan Siparka',/,
  `dialogTitle: 'Pilih File Template (.st) atau Laporan (.spk)',`
);

fs.writeFileSync(path, content, 'utf8');
console.log('home_screen.dart updated successfully');
