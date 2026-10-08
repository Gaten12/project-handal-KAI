import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme/aplikasi_theme.dart';
import '../models/kereta_api.dart';
import '../services/api_service.dart';
import 'daftar_sarana.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  
  Map<String, dynamic>? _currentUser;
  List<dynamic> _schedules = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.2, 0.8, curve: Curves.easeOut),
      ),
    );

    _animController.forward();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final user = await ApiService.getCurrentUser();
      final schedules = await ApiService.getSchedules();
      if (mounted) {
        setState(() {
          _currentUser = user;
          _schedules = schedules;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal memuat tugas: $e'),
            backgroundColor: AplikasiTheme.dangerRed,
          ),
        );
      }
    }
  }

  void _logout() async {
    await ApiService.logout();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => LoginScreen()),
      );
    }
  }

  void _openTask(Map<String, dynamic> schedule) {
    if (schedule['trainData'] == null) {
       ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Data Kereta tidak ditemukan untuk tugas ini.'),
            backgroundColor: AplikasiTheme.dangerRed,
          ),
        );
        return;
    }
    
    try {
      final keretaApi = KeretaApi.fromMap(schedule['trainData']);
      keretaApi.namaKA = schedule['namaKA'] ?? '';
      keretaApi.nomorKA = schedule['nomorKA'] ?? '';
      
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => DaftarSaranaScreen(
            keretaApi: keretaApi, 
            scheduleId: schedule['id'], // We might need to pass scheduleId to submit later
          ),
        ),
      ).then((_) {
        // Refresh when coming back
        _loadData();
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal memproses data tugas: $e'),
            backgroundColor: AplikasiTheme.dangerRed,
          ),
      );
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: AplikasiTheme.orangeBackground,
        child: Stack(
          children: [
            // Top Dark Blue Header with Gradient and Shapes
            ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(40),
                bottomRight: Radius.circular(40),
              ),
              child: Container(
                height: 300,
                decoration: AplikasiTheme.blueHeader,
                child: Stack(
                  children: [
                    Positioned(
                      top: -50,
                      right: -50,
                      child: Container(
                        width: 200,
                        height: 200,
                        decoration: AplikasiTheme.transparentCircleDecoration,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SafeArea(
              child: SlideTransition(
                position: _slideAnimation,
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),
                      // Header Row
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Image.asset(
                                  'assets/Logo_Aplikasi_Putih.png',
                                  width: 40,
                                  height: 40,
                                  fit: BoxFit.contain,
                                ),
                                const SizedBox(width: 12),
                                Image.asset(
                                  'assets/Logo Text Putih.png',
                                  width: 150,
                                  height: 40,
                                  fit: BoxFit.contain,
                                ),
                              ],
                            ),
                            IconButton(
                              icon: const Icon(Icons.logout, color: Colors.white),
                              onPressed: _logout,
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 30),
                      
                      // Welcome Text
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Halo, ${_currentUser?['nama'] ?? 'Petugas'}!',
                              style: AplikasiTheme.welcomeTitleStyle.copyWith(fontSize: 24),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'NIP: ${_currentUser?['nip'] ?? '-'}',
                              style: AplikasiTheme.welcomeSubtitleStyle.copyWith(color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 40),
                      
                      // Content Area (Tugas List)
                      Expanded(
                        child: Container(
                          margin: const EdgeInsets.only(left: 16, right: 16),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: Radius.circular(40),
                              topRight: Radius.circular(40),
                            ),
                          ),
                          child: Stack(
                            children: [
                              Positioned(
                                bottom: -50,
                                right: -50,
                                child: Container(
                                  width: 200,
                                  height: 200,
                                  decoration: AplikasiTheme.bottomCircleDecoration,
                                ),
                              ),
                              Column(
                                children: [
                                  const SizedBox(height: 16),
                                  Container(
                                    width: 40,
                                    height: 4,
                                    decoration: BoxDecoration(
                                      color: Colors.grey[300],
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                  ),
                                  Expanded(
                                    child: RefreshIndicator(
                                      onRefresh: _loadData,
                                      child: _isLoading 
                                          ? const Center(child: CircularProgressIndicator())
                                          : _schedules.isEmpty 
                                              ? _buildEmptyState() 
                                              : _buildTaskList(),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.assignment_turned_in, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'Tidak ada tugas saat ini',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tarik ke bawah untuk memuat ulang',
            style: TextStyle(
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskList() {
    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: _schedules.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 24),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 24,
                  color: const Color(0xFF003058),
                ),
                const SizedBox(width: 8),
                Text(
                  'Menu Utama',
                  style: AplikasiTheme.menuUtamaStyle,
                ),
              ],
            ),
          );
        }

        final task = _schedules[index - 1];
        final isSelesai = task['status'] == 'Selesai';
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF00213E), Color(0xFF004F8A)],
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF003058).withOpacity(0.15),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            leading: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                Icons.directions_subway,
                color: Color(0xFF00213E),
                size: 36,
              ),
            ),
            title: Text(
              '${task['nomorKA']} - ${task['namaKA']}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(
                  'Tanggal: ${task['tanggalInspeksi'] ?? '-'}',
                  style: const TextStyle(color: Colors.white70),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isSelesai 
                        ? Colors.green.withOpacity(0.2) 
                        : (task['status'] == 'Telat' ? Colors.red.withOpacity(0.2) : Colors.amber.withOpacity(0.2)),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelesai 
                          ? Colors.green 
                          : (task['status'] == 'Telat' ? Colors.red : Colors.amber),
                    ),
                  ),
                  child: Text(
                    task['status'] ?? 'Menunggu',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelesai 
                          ? Colors.greenAccent 
                          : (task['status'] == 'Telat' ? Colors.redAccent : Colors.amberAccent),
                    ),
                  ),
                ),
              ],
            ),
            trailing: const Icon(
              Icons.arrow_forward_ios, 
              color: Colors.white, 
              size: 20,
            ),
            onTap: () => _openTask(task),
          ),
        );
      },
    );
  }
}
