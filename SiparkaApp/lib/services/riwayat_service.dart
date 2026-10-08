import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/kereta_api.dart';
import '../models/gerbong.dart';

class RiwayatService {
  static const String _key = 'riwayat_kereta_api';

  static Future<void> saveRiwayat(KeretaApi ka) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      List<KeretaApi> riwayat = await loadRiwayat();

      // Remove if exists to avoid duplicates, update order
      riwayat.removeWhere((item) => item.namaKA == ka.namaKA && item.nomorKA == ka.nomorKA);
      
      // Add to the front
      riwayat.insert(0, ka);

      // Save full data
      final List<Map<String, dynamic>> data = riwayat.map((e) => e.toMap()).toList();

      await prefs.setString(_key, jsonEncode(data));
    } catch (e) {
      // Ignore if SharedPreferences fails (e.g. MissingPluginException)
    }
  }

  static Future<List<KeretaApi>> loadRiwayat() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? dataStr = prefs.getString(_key);
      
      if (dataStr == null) return [];
      
      final List<dynamic> jsonList = jsonDecode(dataStr);
      return jsonList.map((item) => KeretaApi.fromMap(item as Map<String, dynamic>)).toList();
    } catch (e) {
      // Handle MissingPluginException or decode errors smoothly
      return [];
    }
  }
}
