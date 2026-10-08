const fs = require('fs');
const path = '../SiparkaApp/lib/models/kereta_api.dart';
let content = fs.readFileSync(path, 'utf8');

// Replace class KeretaApi { ... } to add pilihanNoKA
content = content.replace(
  /class KeretaApi \{\s*String namaKA;\s*String nomorKA;\s*List<Gerbong> gerbongList;/,
  `class KeretaApi {
  String namaKA;
  String nomorKA;
  List<String>? pilihanNoKA;
  List<Gerbong> gerbongList;`
);

content = content.replace(
  /KeretaApi\(\{\s*required this.namaKA,\s*required this.nomorKA,\s*List<Gerbong>\? gerbongList,\s*\}\)/,
  `KeretaApi({
    required this.namaKA,
    required this.nomorKA,
    this.pilihanNoKA,
    List<Gerbong>? gerbongList,
  })`
);

content = content.replace(
  /nomorKA: map\['nomorKA'\] \?\? '',/,
  `nomorKA: map['nomorKA'] ?? '',
      pilihanNoKA: map['pilihanNoKA'] != null ? List<String>.from(map['pilihanNoKA']) : null,`
);

content = content.replace(
  /'nomorKA': nomorKA,/,
  `'nomorKA': nomorKA,
      if (pilihanNoKA != null) 'pilihanNoKA': pilihanNoKA,`
);

fs.writeFileSync(path, content, 'utf8');
console.log('kereta_api.dart updated successfully');
