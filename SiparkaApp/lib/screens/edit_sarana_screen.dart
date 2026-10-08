import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/aplikasi_theme.dart';
import '../models/kereta_api.dart';
import '../models/gerbong.dart';
import '../services/riwayat_service.dart';

class EditSaranaScreen extends StatefulWidget {
  final KeretaApi keretaApi;

  const EditSaranaScreen({super.key, required this.keretaApi});

  @override
  State<EditSaranaScreen> createState() => _EditSaranaScreenState();
}

class _EditSaranaScreenState extends State<EditSaranaScreen>
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

  void _onTambahSarana() {
    showDialog(
      context: context,
      builder: (context) {
        String newNomor = "";
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'Tambah Sarana',
            style: GoogleFonts.poppins(
              color: const Color(0xFF003058),
              fontWeight: FontWeight.bold,
            ),
          ),
          content: TextField(
            onChanged: (val) => newNomor = val,
            decoration: InputDecoration(
              hintText: 'Misal: K1 0 23 55',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'Batal',
                style: GoogleFonts.poppins(color: Colors.grey),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF8C00),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                if (newNomor.trim().isNotEmpty) {
                  setState(() {
                    widget.keretaApi.gerbongList.add(Gerbong(nomorSarana: newNomor.trim()));
                  });
                  Navigator.pop(context);
                }
              },
              child: Text(
                'Tambah',
                style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        );
      },
    );
  }

  void _onHapusSarana(int index) {
    setState(() {
      widget.keretaApi.gerbongList.removeAt(index);
    });
  }

  void _onSimpan() async {
    // Menyimpan perubahan pada urutan / jumlah sarana ke memory/local storage
    await RiwayatService.saveRiwayat(widget.keretaApi);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final ka = widget.keretaApi;
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 20),
                  // Header text
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Center(
                      child: Text(
                        'Edit Sarana',
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
                        displayName,
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
                              // Drag handle indicator
                              Center(
                                child: Container(
                                  width: 48,
                                  height: 5,
                                  decoration: BoxDecoration(
                                    color: Colors.grey.withOpacity(0.3),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
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
                                          child: Container(
                                            width: double.infinity,
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              borderRadius: BorderRadius.circular(16),
                                              border: Border.all(
                                                color: const Color(0xFFFF8C00), // Garis luar oranye
                                                width: 1.5,
                                              ),
                                            ),
                                            child: Row(
                                              children: [
                                                // Icon
                                                Container(
                                                  width: 60,
                                                  height: 50,
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFF3C79B).withOpacity(0.5),
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
                                                // Name Only
                                                Expanded(
                                                  child: TextFormField(
                                                    key: ValueKey(gerbong),
                                                    initialValue: gerbong.nomorSarana,
                                                    onChanged: (val) {
                                                      gerbong.nomorSarana = val;
                                                    },
                                                    style: GoogleFonts.poppins(
                                                      color: const Color(0xFF003058),
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w800,
                                                    ),
                                                    decoration: const InputDecoration(
                                                      border: InputBorder.none,
                                                      isDense: true,
                                                      contentPadding: EdgeInsets.zero,
                                                    ),
                                                  ),
                                                ),
                                                // Delete button (Red square with trash icon)
                                                GestureDetector(
                                                  onTap: () => _onHapusSarana(index),
                                                  child: Container(
                                                    width: 32,
                                                    height: 32,
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFFE50000), // Merah hapus
                                                      borderRadius: BorderRadius.circular(8),
                                                    ),
                                                    child: const Center(
                                                      child: Icon(
                                                        Icons.delete_outline,
                                                        color: Colors.white,
                                                        size: 20,
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              // Add button at bottom
                              Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: GestureDetector(
                                  onTap: _onTambahSarana,
                                  child: Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFF8C00),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Center(
                                      child: Icon(
                                        Icons.add,
                                        color: Colors.white,
                                        size: 28,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Bottom buttons over orange background
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
                            onPressed: _onSimpan,
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
