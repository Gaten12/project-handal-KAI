import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/aplikasi_theme.dart';
import '../models/kereta_api.dart';
import 'daftar_sarana.dart';

class RiwayatScreen extends StatefulWidget {
  final List<KeretaApi> riwayatList;

  const RiwayatScreen({super.key, required this.riwayatList});

  @override
  State<RiwayatScreen> createState() => _RiwayatScreenState();
}

class _RiwayatScreenState extends State<RiwayatScreen>
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

  
  void _onPilihRiwayat(BuildContext context, KeretaApi ka) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DaftarSaranaScreen(keretaApi: ka),
      ),
    );
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
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  // Header text
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Center(
                      child: Text(
                        'Daftar Kereta',
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
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
                              const SizedBox(height: 16),
                              Expanded(
                                child: ListView.builder(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                                  itemCount: widget.riwayatList.length,
                                  itemBuilder: (context, index) {
                                    final ka = widget.riwayatList[index];
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
                                          child: _RiwayatCard(
                                            ka: ka,
                                            onTap: () => _onPilihRiwayat(context, ka),
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
                    child: SizedBox(
                      width: double.infinity,
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

class _RiwayatCard extends StatefulWidget {
  final KeretaApi ka;
  final VoidCallback onTap;

  const _RiwayatCard({required this.ka, required this.onTap});

  @override
  State<_RiwayatCard> createState() => _RiwayatCardState();
}

class _RiwayatCardState extends State<_RiwayatCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final formattedDate = "${today.day.toString().padLeft(2, '0')}/${today.month.toString().padLeft(2, '0')}/${today.year}";
    // Use the actual train name. Since your example had "KA LODAYA", we'll make sure it prefixes "KA " if it doesn't have it.
    final displayName = widget.ka.namaKA.toUpperCase().startsWith('KA ') 
        ? widget.ka.namaKA.toUpperCase() 
        : 'KA ${widget.ka.namaKA.toUpperCase()}';

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
                      displayName,
                      style: GoogleFonts.poppins(
                        color: const Color(0xFF003058),
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}