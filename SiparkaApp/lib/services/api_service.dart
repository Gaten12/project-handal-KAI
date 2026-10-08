import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/kereta_api.dart';

class ApiService {
  static const String baseUrl = 'https://siparka.online/api';

  static Future<Map<String, dynamic>> login(String nip, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'nip': nip, 'password': password}),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['token'] != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);
        await prefs.setString('user', jsonEncode(data['user']));
        return {'success': true, 'user': data['user']};
      }
      return {'success': false, 'message': data['message'] ?? 'Login failed'};
    } catch (e) {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server'};
    }
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
  }

  static Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey('token');
  }

  static Future<Map<String, dynamic>?> getCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    if (userStr != null) {
      return jsonDecode(userStr);
    }
    return null;
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<List<dynamic>> getSchedules() async {
    try {
      final user = await getCurrentUser();
      if (user == null) throw Exception('Not logged in');
      
      final token = await getToken();
      
      final nip = user['nip'];
      final response = await http.get(
        Uri.parse('$baseUrl/schedules?nip=$nip'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      throw Exception('Gagal memuat jadwal: ${response.statusCode}');
    } catch (e) {
      print('Error getSchedules: $e');
      throw e;
    }
  }

  static Future<bool> submitHasilInspeksi(Map<String, dynamic> hasilData, String scheduleId) async {
    try {
      final token = await getToken();
      final user = await getCurrentUser();
      
      if (user != null) {
        hasilData['petugasData'] = {
          'nama': user['nama'],
          'nip': user['nip']
        };
      }
      
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      // 1. Submit Hasil ke API
      final response = await http.post(
        Uri.parse('$baseUrl/hasil'),
        headers: headers,
        body: jsonEncode(hasilData),
      );

      if (response.statusCode == 200) {
        // 2. Update Status Schedule menjadi Selesai
        await http.put(
          Uri.parse('$baseUrl/schedules/$scheduleId'),
          headers: headers,
          body: jsonEncode({
            'status': 'Selesai',
            'trainData': hasilData,
          }),
        );
        return true;
      }
      return false;
    } catch (e) {
      print('Error submitHasilInspeksi: $e');
      return false;
    }
  }
}

