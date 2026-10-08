import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/aplikasi_theme.dart';
import '../models/kereta_api.dart';
import '../models/gerbong.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class PreviewLaporanScreen extends StatefulWidget {
  final KeretaApi keretaApi;
  final String? scheduleId;
  final int initialGerbongIndex;

  const PreviewLaporanScreen({
    super.key,
    required this.keretaApi,
    this.initialGerbongIndex = 0,
    this.scheduleId,
  });

  @override
  State<PreviewLaporanScreen> createState() => _PreviewLaporanScreenState();
}

class _PreviewLaporanScreenState extends State<PreviewLaporanScreen>
    with SingleTickerProviderStateMixin {
  late int _currentIndex;
  late PageController _pageController;
  late AnimationController _fadeController;
  bool _isSubmitting = false;

  Future<void> _submitData() async {
    if (widget.scheduleId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'ID Jadwal tidak ditemukan, tidak bisa mengirim ke server',
            style: AplikasiTheme.bodyMedium.copyWith(color: Colors.white),
          ),
          backgroundColor: AplikasiTheme.dangerRed,
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final success = await ApiService.submitHasilInspeksi(
        widget.keretaApi.toMap(),
        widget.scheduleId!,
      );

      if (success) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Data berhasil dikirim ke server',
              style: AplikasiTheme.bodyMedium.copyWith(color: Colors.white),
            ),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
          (route) => false,
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Gagal mengirim data ke server',
              style: AplikasiTheme.bodyMedium.copyWith(color: Colors.white),
            ),
            backgroundColor: AplikasiTheme.dangerRed,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Terjadi kesalahan: ',
            style: AplikasiTheme.bodyMedium.copyWith(color: Colors.white),
          ),
          backgroundColor: AplikasiTheme.dangerRed,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialGerbongIndex;
    _pageController = PageController(initialPage: _currentIndex);
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _fadeController.forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  void _goToPrevious() {
    if (_currentIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _goToNext() {
    if (_currentIndex < widget.keretaApi.gerbongList.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _exportData() async {
    try {
      final ka = widget.keretaApi;
      
      // Serialize to JSON
      final jsonData = jsonEncode(ka.toMap());
      final now = DateTime.now();
      final dateStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
      final fileName = 'Hasil Pemeriksaan ${ka.namaKA} ($dateStr).spk';
      
      // Use XFile.fromData for cross-platform support (including Web) without path_provider
      final xFile = XFile.fromData(
        utf8.encode(jsonData),
        name: fileName,
        mimeType: 'application/json',
      );
      
      // Share/Download file
      await Share.shareXFiles([xFile], text: 'Laporan Inspeksi KA ${ka.namaKA}');
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Gagal export laporan: $e',
              style: AplikasiTheme.bodyMedium.copyWith(color: Colors.white),
            ),
            backgroundColor: AplikasiTheme.dangerRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: AplikasiTheme.orangeBackground,
        child: Stack(
          children: [
            // Top Header
            ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(40),
                bottomRight: Radius.circular(40),
              ),
              child: Container(
                height: MediaQuery.of(context).size.height * 0.45,
                width: double.infinity,
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
                    Positioned(
                      bottom: -100,
                      left: -50,
                      child: Container(
                        width: 250,
                        height: 250,
                        decoration: AplikasiTheme.transparentCircleDecoration,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SafeArea(
              child: FadeTransition(
                opacity: _fadeController,
                child: Column(
                  children: [
                    const SizedBox(height: 20),
                    // Header text
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Center(
                        child: Text(
                          'Preview Inspeksi',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Subtitle Pill
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30),
                        ),
                        child: Text(
                          'Sarana: ${widget.keretaApi.gerbongList[_currentIndex].nomorSarana}',
                          style: GoogleFonts.poppins(
                            color: const Color(0xFF003058),
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Main Content Card
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Container(
                          width: double.infinity,
                          decoration: AplikasiTheme.whiteCardDecoration,
                          child: ClipRRect(
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(30),
                              topRight: Radius.circular(30),
                            ),
                            child: Column(
                              children: [
                                const SizedBox(height: 16),
                                Container(
                                  width: 48,
                                  height: 5,
                                  decoration: BoxDecoration(
                                    color: Colors.grey.withOpacity(0.25),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                // PageView for gerbong data
                                Expanded(
                                  child: PageView.builder(
                                    controller: _pageController,
                                    onPageChanged: (index) {
                                      setState(() {
                                        _currentIndex = index;
                                      });
                                    },
                                    itemCount: widget.keretaApi.gerbongList.length,
                                    itemBuilder: (context, index) {
                                      final gerbong =
                                          widget.keretaApi.gerbongList[index];
                                      return _buildGerbongPage(gerbong);
                                    },
                                  ),
                                ),
                                // Navigation arrows & page indicator
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 8,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      IconButton(
                                        onPressed: _currentIndex > 0
                                            ? _goToPrevious
                                            : null,
                                        icon: Icon(
                                          Icons.arrow_back,
                                          color: _currentIndex > 0
                                              ? Colors.grey[600]
                                              : Colors.grey[400],
                                          size: 28,
                                        ),
                                      ),
                                      // Page indicator dots
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: List.generate(
                                          widget.keretaApi.gerbongList.length,
                                          (i) => AnimatedContainer(
                                            duration: const Duration(milliseconds: 300),
                                            margin: const EdgeInsets.symmetric(
                                                horizontal: 3),
                                            width: i == _currentIndex ? 24 : 8,
                                            height: 8,
                                            decoration: BoxDecoration(
                                              color: i == _currentIndex
                                                  ? const Color(0xFFFF8C00)
                                                  : const Color(0xFFFF8C00).withOpacity(0.4),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                          ),
                                        ),
                                      ),
                                      IconButton(
                                        onPressed: _currentIndex <
                                                widget.keretaApi.gerbongList.length - 1
                                            ? _goToNext
                                            : null,
                                        icon: Icon(
                                          Icons.arrow_forward,
                                          color: _currentIndex <
                                                  widget.keretaApi.gerbongList.length - 1
                                              ? Colors.grey[600]
                                              : Colors.grey[400],
                                          size: 28,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    // Bottom buttons
                    Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFF003058),
                                shape: const StadiumBorder(),
                                padding: const EdgeInsets.symmetric(vertical: 16),
                              ),
                              onPressed: () => Navigator.pop(context),
                              child: Text(
                                'Kembali',
                                style: GoogleFonts.poppins(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF003058),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF003058),
                                foregroundColor: Colors.white,
                                side: const BorderSide(color: Colors.blue, width: 2),
                                shape: const StadiumBorder(),
                                padding: const EdgeInsets.symmetric(vertical: 16),
                              ),
                              onPressed: _isSubmitting ? null : _submitData,
                                child: _isSubmitting ? CircularProgressIndicator(color: Colors.white) : Text(
                                'Kirim ke Server',
                                style: GoogleFonts.poppins(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGerbongPage(Gerbong gerbong) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.vertical,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Table(
                border: TableBorder.all(
                  color: Colors.black, // Solid black border
                  width: 1.0,
                ),
                columnWidths: const {
                  0: FlexColumnWidth(2.5),
                  1: IntrinsicColumnWidth(),
                  2: FlexColumnWidth(2),
                },
                defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                children: [
                  TableRow(
                    decoration: const BoxDecoration(
                      color: Color(0xFF90A4AE), // Grey-blue header background
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Text(
                          'Nama',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Text(
                          'Status',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Text(
                          'Deskripsi',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                  ...gerbong.inspeksiItems
                      .where((item) {
                        final namaUpper = item.nama.toUpperCase();
                        return item.status.toUpperCase() != 'AWAL' &&
                               namaUpper != 'PIDS KERETA BELAKANG' &&
                               namaUpper != 'PIDS KERETA DEPAN';
                      })
                      .map((item) {
                    final status = item.status.toUpperCase();
                    Color bgColor;
                    Color textColor = Colors.black87;
                    if (status == 'BAIK') {
                      bgColor = Colors.green.withOpacity(0.3);
                      textColor = Colors.green[800]!;
                    } else if (status == 'RUSAK') {
                      bgColor = Colors.red.withOpacity(0.3);
                      textColor = Colors.red[800]!;
                    } else {
                      bgColor = Colors.grey.withOpacity(0.3);
                      textColor = Colors.grey[800]!;
                    }

                    return TableRow(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Text(
                            item.nama.replaceAll('Panel PIDS - nvar', 'nvr').replaceAll('Panel PIDS - switch up', 'switch hub').replaceAll('Panel PIDS - nvr', 'nvr').replaceAll('Panel PIDS - switch hub', 'switch hub'),
                            style: GoogleFonts.poppins(fontSize: 13, color: Colors.black87),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Align(
                            alignment: Alignment.center,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: bgColor,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: textColor, width: 1),
                              ),
                              child: Text(
                                status,
                                style: GoogleFonts.poppins(
                                  color: textColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Text(
                            (item.deskripsiKerusakan == null || item.deskripsiKerusakan!.isEmpty) 
                                ? '-' 
                                : item.deskripsiKerusakan!,
                            style: GoogleFonts.poppins(fontSize: 12, color: Colors.black54),
                          ),
                        ),
                      ],
                    );
                  }),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

