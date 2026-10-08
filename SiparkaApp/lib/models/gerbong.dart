import 'inspeksi_item.dart';

class Gerbong {
  String nomorSarana;
  List<InspeksiItem> inspeksiItems;
  bool isInspected;

  Gerbong({
    required this.nomorSarana,
    List<InspeksiItem>? inspeksiItems,
    this.isInspected = false,
  }) : inspeksiItems = inspeksiItems ?? _defaultInspeksiItems();

  /// Gets a combined string of all damage descriptions for CSV export
  String get aggregatedNote {
    final notes = inspeksiItems
        .where((item) => item.deskripsiKerusakan != null && item.deskripsiKerusakan!.isNotEmpty)
        .map((item) => '${item.nama}: ${item.deskripsiKerusakan}')
        .toList();
    return notes.join(', ');
  }

  static List<InspeksiItem> _defaultInspeksiItems() {
    return [
      InspeksiItem(nama: 'PIDS Kereta Belakang', status: 'AWAL'),
      InspeksiItem(nama: 'csot 2', status: 'AWAL'),
      InspeksiItem(nama: 'csot 1', status: 'AWAL'),
      InspeksiItem(nama: 'cam 2', status: 'AWAL'), // CCTV Belakang
      InspeksiItem(nama: 'Rto R', status: 'AWAL'),
      InspeksiItem(nama: 'AP', status: 'AWAL'), // Router tengah gerbong
      InspeksiItem(nama: 'cam 1', status: 'AWAL'), // CCTV Depan
      InspeksiItem(nama: 'PIDS Kereta Depan', status: 'AWAL'),
      InspeksiItem(nama: 'Rto L', status: 'AWAL'),
    ];
  }

  // Mapping untuk export ke PDF/CSV saja
  static const Map<String, String> _exportMapping = {
    'Router': 'WIFI BERFUNGSI',
    'Rto L': 'PIDS LUAR SISI A',
    'Rto R': 'PIDS LUAR SISI E',
    'PIDS Kereta Belakang': 'PIDS DALAM TD KECIL',
    'PIDS Kereta Depan': 'PIDS DALAM TD BESAR',
    'CCTV Belakang Berfungsi': 'CCTV BERFUNGSI',
    'CCTV Belakang Terbackup': 'CCTV TERBACKUP',
  };

  // Import mapping: semua variasi nama dari server/DB → nama internal Flutter
  static const Map<String, String> _importMapping = {
    // Dari export mapping (nama yang dikirim saat submit lama)
    'WIFI BERFUNGSI': 'AP',
    'PIDS LUAR SISI A': 'Rto L',
    'PIDS LUAR SISI E': 'Rto R',
    'PIDS DALAM TD KECIL': 'PIDS Kereta Belakang',
    'PIDS DALAM TD BESAR': 'PIDS Kereta Depan',
    'CCTV BERFUNGSI': 'cam 2',
    'CCTV TERBACKUP': 'cam 2',
    // Mapping tambahan untuk data lama ke nama baru
    'TV BELAKANG 1': 'csot 1',
    'TV BELAKANG 2': 'csot 2',
    'RUNNING TEKS 1': 'Rto L',
    'RUNNING TEKS 2': 'Rto R',
    // Variasi dari data Excel/server web lama
    'WIFI': 'AP',
    'ROUTER': 'AP',
    'TD KECIL': 'PIDS Kereta Belakang',
    'TD BESAR': 'PIDS Kereta Depan',
    // Nama CCTV tanpa suffix (dari default list versi lama)
    'CCTV BELAKANG': 'cam 2',
    'CCTV DEPAN': 'cam 1',
    'CCTV BELAKANG BERFUNGSI': 'cam 2',
    'CCTV DEPAN BERFUNGSI': 'cam 1',
  };

  /// Load gerbong dari data server/DB.
  /// Mendukung dua format: format server baru (nama internal) dan format lama (nama Excel).
  factory Gerbong.fromMap(Map<String, dynamic> map) {
    List<InspeksiItem>? loadedItems;

    final rawItems = map['inspeksiItems'] as List<dynamic>?;
    if (rawItems != null && rawItems.isNotEmpty) {
      // Buat lookup: nama internal → InspeksiItem dari DB
      final savedByName = <String, InspeksiItem>{};
      for (final i in rawItems) {
        final itemMap = Map<String, dynamic>.from(i as Map<String, dynamic>);
        final namaAsli = itemMap['nama']?.toString() ?? '';
        final namaUpper = namaAsli.toUpperCase();

        // Cari nama internal yang sesuai
        String namaInternal = namaAsli;
        if (_importMapping.containsKey(namaUpper)) {
          namaInternal = _importMapping[namaUpper]!;
        }

        savedByName[namaInternal] = InspeksiItem(
          nama: namaInternal,
          status: itemMap['status'] ?? 'AWAL',
          deskripsiKerusakan: itemMap['deskripsiKerusakan'],
        );
      }

      // Mulai dari default list, overlay dengan status dari DB
      // Ini memastikan semua item default selalu ada
      final defaults = _defaultInspeksiItems();
      loadedItems = defaults.map((defaultItem) {
        if (savedByName.containsKey(defaultItem.nama)) {
          return savedByName[defaultItem.nama]!;
        }
        return defaultItem;
      }).toList();

      // Tambahkan item dari DB yang tidak ada di default list, kecuali yang sudah di-deprecate
      final deprecatedItems = ['TV DEPAN 1', 'TV DEPAN 2', 'TV BELAKANG 1', 'TV BELAKANG 2', 'RUNNING TEKS 1', 'RUNNING TEKS 2'];
      for (final saved in savedByName.values) {
        if (deprecatedItems.contains(saved.nama.toUpperCase())) continue;
        if (!loadedItems.any((d) => d.nama == saved.nama)) {
          loadedItems.add(saved);
        }
      }
    }

    final gerbong = Gerbong(
      nomorSarana: map['nomorSarana'] ?? '',
      inspeksiItems: loadedItems,
    );

    final wasInspected = map['isInspected'] ?? 
        (loadedItems?.every((i) => i.status != 'AWAL') ?? false);
    gerbong.isInspected = wasInspected;

    // Jika gerbong belum diinspeksi, reset semua item ke AWAL
    // agar template data dengan status BAIK tidak tampil seolah sudah diisi
    if (!wasInspected) {
      for (final item in gerbong.inspeksiItems) {
        item.status = 'AWAL';
      }
    }

    return gerbong;
  }

  /// toMap() untuk simpan ke server — menggunakan nama internal (TIDAK di-transform)
  /// agar saat dimuat kembali ke aplikasi, semua 11 item (termasuk TV) terbaca dengan benar.
  Map<String, dynamic> toMap() {
    return {
      'nomorSarana': nomorSarana,
      'inspeksiItems': inspeksiItems.map((i) => i.toMap()).toList(),
      'isInspected': isInspected,
    };
  }

  /// toMapForExport() — untuk PDF/CSV, gunakan nama singkat (transformed)
  Map<String, dynamic> toMapForExport() {
    return {
      'nomorSarana': nomorSarana,
      'inspeksiItems': inspeksiItems.map((i) {
        var m = i.toMap();
        if (_exportMapping.containsKey(m['nama'])) {
          m['nama'] = _exportMapping[m['nama']];
        }
        return m;
      }).toList(),
      'isInspected': isInspected,
    };
  }
}
