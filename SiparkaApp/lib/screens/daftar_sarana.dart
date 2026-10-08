import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/aplikasi_theme.dart';
import '../models/kereta_api.dart';
import '../services/riwayat_service.dart';
import 'inspeksi_gerbong_screen.dart';
import 'preview_laporan_screen.dart';
import 'edit_sarana_screen.dart';

class DaftarSaranaScreen extends StatefulWidget {
  final KeretaApi keretaApi;
  final String? scheduleId;

  const DaftarSaranaScreen({super.key, required this.keretaApi, this.scheduleId});

  @override
  State<DaftarSaranaScreen> createState() => _DaftarSaranaScreenState();
}

class _DaftarSaranaScreenState extends State<DaftarSaranaScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _onEditSarana() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditSaranaScreen(keretaApi: widget.keretaApi),
      ),
    );
    // Refresh the list after returning from edit screen
    if (mounted) {
      setState(() {});
    }
  }

  void _onGerbongTap(int index) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => InspeksiGerbongScreen(
          gerbong: widget.keretaApi.gerbongList[index],
          keretaApi: widget.keretaApi,
          gerbongIndex: index,
        ),
      ),
    );
    // Refresh to show updated inspection status
    setState(() {});
  }

  void _onLanjut() {
    if (widget.keretaApi.nomorKA.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Harap pilih Nomor KA terlebih dahulu!',
            style: AplikasiTheme.bodyMedium.copyWith(color: Colors.white),
          ),
          backgroundColor: AplikasiTheme.dangerRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return;
    }
    if (!widget.keretaApi.isAllGerbongInspected) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Harap inspeksi semua sarana sebelum lanjut!',
            style: AplikasiTheme.bodyMedium.copyWith(color: Colors.white),
          ),
          backgroundColor: AplikasiTheme.dangerRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return;
    }

    RiwayatService.saveRiwayat(widget.keretaApi);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PreviewLaporanScreen(
                          scheduleId: widget.scheduleId,
          keretaApi: widget.keretaApi,
          initialGerbongIndex: 0,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ka = widget.keretaApi;

    // Menghilangkan awalan "KA " jika ada agar sesuai mockup
    final String cleanName = ka.namaKA.toUpperCase().replaceFirst(RegExp(r'^KA\s+'), '');
    final displayName = "$cleanName | ${ka.nomorKA}";

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
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  // Header text
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Center(
                      child: Text(
                        'Daftar Sarana',
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
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: (ka.nomorKA.isEmpty && ka.pilihanNoKA != null && ka.pilihanNoKA!.isNotEmpty)
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                "$cleanName | ",
                                style: GoogleFonts.poppins(
                                  color: const Color(0xFF003058),
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              DropdownButton<String>(
                                value: null,
                                hint: Text('Pilih No KA', style: GoogleFonts.poppins(fontSize: 16, color: Colors.grey)),
                                underline: const SizedBox(),
                                icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF003058)),
                                items: ka.pilihanNoKA!.map((String value) {
                                  return DropdownMenuItem<String>(
                                    value: value,
                                    child: Text(value, style: GoogleFonts.poppins(fontSize: 16, color: const Color(0xFF003058), fontWeight: FontWeight.bold)),
                                  );
                                }).toList(),
                                onChanged: (newValue) {
                                  if (newValue != null) {
                                    setState(() {
                                      ka.nomorKA = newValue;
                                    });
                                  }
                                },
                              ),
                            ],
                          )
                        : Text(
                            displayName,
                            style: GoogleFonts.poppins(
                              color: const Color(0xFF003058),
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
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
                              // Drag handle indicator
                              const SizedBox(height: 16),
                              Container(
                                width: 48,
                                height: 5,
                                decoration: BoxDecoration(
                                  color: Colors.grey.withOpacity(0.3),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              const SizedBox(height: 8),
                              // Edit Button at top right
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 20),
                                child: Align(
                                  alignment: Alignment.centerRight,
                                  child: GestureDetector(
                                    onTap: _onEditSarana,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFF8C00),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            'Edit',
                                            style: GoogleFonts.poppins(
                                              color: Colors.white,
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          const Icon(
                                            Icons.edit_outlined,
                                            color: Colors.white,
                                            size: 16,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Expanded(
                                child: ListView.builder(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                                  itemCount: ka.gerbongList.length,
                                  itemBuilder: (context, index) {
                                    final gerbong = ka.gerbongList[index];
                                    final delay = (index * 0.08).clamp(0.0, 0.6);
                                    final itemAnim = CurvedAnimation(
                                      parent: _animController,
                                      curve: Interval(delay, delay + 0.4, curve: Curves.easeOut),
                                    );

                                    return FadeTransition(
                                      opacity: itemAnim,
                                      child: SlideTransition(
                                        position: Tween<Offset>(
                                          begin: const Offset(0, 0.3),
                                          end: Offset.zero,
                                        ).animate(itemAnim),
                                        child: Padding(
                                          padding: const EdgeInsets.only(bottom: 16),
                                          child: _GerbongCard(
                                            nomorSarana: gerbong.nomorSarana,
                                            isInspected: gerbong.isInspected,
                                            onTap: () => _onGerbongTap(index),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Bottom buttons outside white card, over orange background
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
                              shape: const StadiumBorder(),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            onPressed: _onLanjut,
                            child: Text(
                              'Simpan',
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
          ],
        ),
      ),
    );
  }
}

class _GerbongCard extends StatefulWidget {
  final String nomorSarana;
  final bool isInspected;
  final VoidCallback onTap;

  const _GerbongCard({
    required this.nomorSarana,
    required this.isInspected,
    required this.onTap,
  });

  @override
  State<_GerbongCard> createState() => _GerbongCardState();
}

class _GerbongCardState extends State<_GerbongCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final formattedDate = "${today.day.toString().padLeft(2, '0')}/${today.month.toString().padLeft(2, '0')}/${today.year}";

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedScale(
        scale: _isPressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFFFF8C00), // Orange outline
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              // Light orange background with icon
              Container(
                width: 60,
                height: 50,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3C79B).withOpacity(0.5), // Light orange
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Image.asset(
                    'assets/Gerbong.png',
                    width: 56,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      formattedDate,
                      style: GoogleFonts.poppins(
                        color: const Color(0xFFFF8C00),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.nomorSarana,
                      style: GoogleFonts.poppins(
                        color: const Color(0xFF003058),
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              // Status Icon
              if (widget.isInspected)
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.green, width: 1.5),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.check,
                      color: Colors.green,
                      size: 18,
                    ),
                  ),
                )
              else
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF8C00).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFF8C00), width: 1.5),
                  ),
                  child: const Center(
                    child: Text(
                      '!',
                      style: TextStyle(
                        color: Color(0xFFFF8C00),
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        height: 1.2,
                      ),
                    ),
                  ),
                ),
              const SizedBox(width: 8),
            ],
          ),
        ),
      ),
    );
  }
}
