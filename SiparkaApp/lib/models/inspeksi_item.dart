class InspeksiItem {
  String nama;
  String status; // "BAIK" or "RUSAK"
  String? deskripsiKerusakan;

  InspeksiItem({
    required this.nama,
    required this.status,
    this.deskripsiKerusakan,
  });

  bool get isBaik => status == 'BAIK';
  bool get isRusak => status == 'RUSAK';
  bool get isTiada => status == 'TIADA';

  factory InspeksiItem.fromMap(Map<String, dynamic> map) {
    return InspeksiItem(
      nama: map['nama'] ?? '',
      status: map['status'] ?? 'BAIK',
      deskripsiKerusakan: map['deskripsiKerusakan'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'nama': nama,
      'status': status,
      'deskripsiKerusakan': deskripsiKerusakan,
    };
  }
}
