import 'gerbong.dart';

class KeretaApi {
  String namaKA;
  String nomorKA;
  List<String>? pilihanNoKA;
  List<Gerbong> gerbongList;

  KeretaApi({
    required this.namaKA,
    required this.nomorKA,
    this.pilihanNoKA,
    List<Gerbong>? gerbongList,
  }) : gerbongList = gerbongList ?? [];

  /// Display string: "KA LODAYA | 123"
  String get displayHeader => '$namaKA | $nomorKA';

  /// Check if all gerbongs have been inspected
  bool get isAllGerbongInspected {
    if (gerbongList.isEmpty) return false;
    return gerbongList.every((g) => g.isInspected);
  }

  /// Create from imported data map
  factory KeretaApi.fromMap(Map<String, dynamic> map) {
    return KeretaApi(
      namaKA: map['namaKA'] ?? '',
      nomorKA: map['nomorKA'] ?? '',
      pilihanNoKA: map['pilihanNoKA'] != null ? List<String>.from(map['pilihanNoKA']) : null,
      gerbongList: (map['gerbongList'] as List<dynamic>?)
              ?.map((g) => Gerbong.fromMap(g as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'namaKA': namaKA,
      'nomorKA': nomorKA,
      if (pilihanNoKA != null) 'pilihanNoKA': pilihanNoKA,
      'gerbongList': gerbongList.map((g) => g.toMap()).toList(),
    };
  }
}
