import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/aplikasi_theme.dart';
import '../models/kereta_api.dart';
import '../models/gerbong.dart';
import '../models/inspeksi_item.dart';

class InspeksiGerbongScreen extends StatefulWidget {
  final Gerbong gerbong;
  final KeretaApi? keretaApi;
  final int? gerbongIndex;

  const InspeksiGerbongScreen({
    super.key,
    required this.gerbong,
    this.keretaApi,
    this.gerbongIndex,
  });

  @override
  State<InspeksiGerbongScreen> createState() => _InspeksiGerbongScreenState();
}

class _InspeksiGerbongScreenState extends State<InspeksiGerbongScreen> {
  late PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.gerbongIndex ?? 0;
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onSimpan() {
    final currentGerbong = widget.keretaApi != null
        ? widget.keretaApi!.gerbongList[_currentIndex]
        : widget.gerbong;
    setState(() {
      currentGerbong.isInspected = true;
      for (var item in currentGerbong.inspeksiItems) {
        if (item.status == 'AWAL') {
          item.status = 'BAIK';
        }
      }
    });
    Navigator.pop(context);
  }

  Future<bool> _onWillPop() async {
    final shouldPop = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withAlpha(25),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 40),
            ),
            const SizedBox(height: 16),
            Text(
              'Batalkan Inspeksi?',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF003058),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Data yang belum disimpan akan hilang.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Kembali',
                      style: GoogleFonts.poppins(
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Ya',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    return shouldPop ?? false;
  }

  void _goToPrevious() {
    if (_currentIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _goToNext() {
    if (widget.keretaApi != null &&
        _currentIndex < widget.keretaApi!.gerbongList.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  Widget _buildSingleGerbong(Gerbong gerbong, int index) {
    return Column(
      children: [
        // Subtitle Pill with Navigation Arrows
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.keretaApi != null && index > 0)
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: _goToPrevious,
                )
              else
                const SizedBox(width: 48),
              Expanded(
                child: Center(
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 40, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: Text(
                      gerbong.nomorSarana,
                      style: GoogleFonts.poppins(
                        color: const Color(0xFF003058),
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
              if (widget.keretaApi != null &&
                  index < widget.keretaApi!.gerbongList.length - 1)
                IconButton(
                  icon: const Icon(Icons.arrow_forward, color: Colors.white),
                  onPressed: _goToNext,
                )
              else
                const SizedBox(width: 48),
            ],
          ),
        ),
        const SizedBox(height: 24),
        // Main Content Card
        Expanded(
          child: Container(
            width: double.infinity,
            // Not full white card, just clip the diagram directly with rounded corners
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 20,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(30),
              child: _InteractiveDiagram(
                gerbong: gerbong,
                onUpdate: () => setState(() {}),
              ),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: _onWillPop,
      child: Scaffold(
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
                        'Inspeksi Sarana',
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: widget.keretaApi == null
                        ? _buildSingleGerbong(widget.gerbong, 0)
                        : PageView.builder(
                            controller: _pageController,
                            onPageChanged: _onPageChanged,
                            physics: const BouncingScrollPhysics(),
                            itemCount: widget.keretaApi!.gerbongList.length,
                            itemBuilder: (context, index) {
                              return AnimatedBuilder(
                                animation: _pageController,
                                builder: (context, child) {
                                  double value = 1.0;
                                  if (_pageController.position.haveDimensions) {
                                    value = _pageController.page! - index;
                                  } else {
                                    value = _currentIndex.toDouble() -
                                        index.toDouble();
                                  }

                                  // Simple Scale and Fade Effect
                                  double scale = (1 - (value.abs() * 0.05))
                                      .clamp(0.95, 1.0);
                                  double opacity =
                                      (1 - (value.abs() * 0.5)).clamp(0.5, 1.0);

                                  return Opacity(
                                    opacity: opacity,
                                    child: Transform.scale(
                                      scale: scale,
                                      alignment: Alignment.center,
                                      child: child,
                                    ),
                                  );
                                },
                                child: _buildSingleGerbong(
                                    widget.keretaApi!.gerbongList[index],
                                    index),
                              );
                            },
                          ),
                  ),
                  // Bottom buttons outside, over orange background
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
                            onPressed: () async {
                              final shouldPop = await _onWillPop();
                              if (shouldPop && context.mounted) {
                                Navigator.pop(context);
                              }
                            },
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
    ));
  }
}

class _InteractiveDiagram extends StatelessWidget {
  final Gerbong gerbong;
  final VoidCallback onUpdate;

  const _InteractiveDiagram({required this.gerbong, required this.onUpdate});

  void _showForm(BuildContext context, InspeksiItem item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _BottomSheetForm(item: item, onSave: onUpdate),
    );
  }

  void _showCctvForm(BuildContext context, String itemName) {
    var itemCctv = gerbong.inspeksiItems
        .firstWhere((i) => i.nama == itemName, orElse: () {
      var newItem = InspeksiItem(nama: itemName, status: 'AWAL');
      gerbong.inspeksiItems.add(newItem);
      return newItem;
    });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _BottomSheetCctvForm(
        itemCctv: itemCctv,
        itemName: itemName,
        onSave: onUpdate,
      ),
    );
  }

  Widget _buildImageItem(BuildContext context, String itemName,
      String defaultImagePath, double width, double height,
      [int quarterTurns = 0]) {
    if (itemName.contains('cam')) {
      var itemCctv = gerbong.inspeksiItems.firstWhere(
        (i) => i.nama == itemName,
        orElse: () => InspeksiItem(nama: '', status: 'NOT_FOUND'),
      );
      if (itemCctv.status == 'NOT_FOUND') {
        itemCctv = InspeksiItem(nama: itemName, status: 'AWAL');
        gerbong.inspeksiItems.add(itemCctv);
      }

      String imagePath = defaultImagePath;
      if (itemCctv.status == 'RUSAK') {
        imagePath = 'assets/CCTV_RUSAK.png';
      } else if (itemCctv.status == 'TIADA') {
        imagePath = 'assets/CCTV_TIADA.png';
      } else if (itemCctv.status == 'BAIK') {
        imagePath = 'assets/CCTV_BAIK.png';
      }

      Widget img = Image.asset(
        imagePath,
        width: width,
        height: height,
        fit: BoxFit.fill,
        errorBuilder: (context, error, stackTrace) => Container(
          width: width,
          height: height,
          color: Colors.red.withOpacity(0.3),
          child: const Center(
              child: Icon(Icons.broken_image, color: Colors.white, size: 16)),
        ),
      );

      if (quarterTurns != 0) {
        img = RotatedBox(quarterTurns: quarterTurns, child: img);
      }

      return GestureDetector(
        onTap: () => _showCctvForm(context, itemName),
        child: img,
      );
    }

    var item = gerbong.inspeksiItems.firstWhere(
      (i) => i.nama == itemName,
      orElse: () => InspeksiItem(nama: '', status: 'NOT_FOUND'),
    );

    if (item.status == 'NOT_FOUND') {
      item = InspeksiItem(nama: itemName, status: 'AWAL');
      gerbong.inspeksiItems.add(item);
    }

    String imagePath = defaultImagePath;

    if (itemName == 'Rti1') {
      // PIDS Kereta Belakang (atas)
      if (item.status == 'BAIK')
        imagePath = 'assets/RTI_1_BAIK.png';
      else if (item.status == 'RUSAK')
        imagePath = 'assets/RTI_1_RUSAK.png';
      else if (item.status == 'TIADA')
        imagePath = 'assets/RTI_1_TIADA.png';
    } else if (itemName == 'Rti2') {
      // PIDS Kereta Depan (bawah)
      if (item.status == 'BAIK')
        imagePath = 'assets/RTI_2_BAIK.png';
      else if (item.status == 'RUSAK')
        imagePath = 'assets/RTI_2_RUSAK.png';
      else if (item.status == 'TIADA') imagePath = 'assets/RTI_2_TIADA.png';
    } else if (itemName == 'csot 1' || itemName == 'csot 2') {
      // Monitor csot (pengganti TV)
      if (item.status == 'BAIK')
        imagePath = 'assets/PIDS_TV_BAIK.png';
      else if (item.status == 'RUSAK')
        imagePath = 'assets/PIDS_TV_RUSAK.png';
      else if (item.status == 'TIADA') imagePath = 'assets/PIDS_TV_TIADA.png';
    } else if (itemName == 'Rto L') {
      // Running text samping Kiri
      if (item.status == 'BAIK')
        imagePath = 'assets/RTOL_BAIK.png';
      else if (item.status == 'RUSAK')
        imagePath = 'assets/RTOL_RUSAK.png';
      else if (item.status == 'TIADA') imagePath = 'assets/RTOL_TIADA.png';
    } else if (itemName == 'Rto R') {
      // Running text samping Kanan
      if (item.status == 'BAIK')
        imagePath = 'assets/RTOR_BAIK.png';
      else if (item.status == 'RUSAK')
        imagePath = 'assets/RTOR_RUSAK.png';
      else if (item.status == 'TIADA') imagePath = 'assets/RTOR_TIADA.png';
    } else if (itemName.contains('Router') || itemName == 'AP') {
      if (item.status == 'BAIK')
        imagePath = 'assets/Router_Baik.png';
      else if (item.status == 'RUSAK')
        imagePath = 'assets/Router_Rusak.png';
      else if (item.status == 'TIADA') imagePath = 'assets/Router_Tiada.png';
    }

    Widget img = Image.asset(
      imagePath,
      width: width,
      height: height,
      fit: BoxFit.fill,
      errorBuilder: (context, error, stackTrace) => Container(
        width: width,
        height: height,
        color: Colors.red.withOpacity(0.3),
        child: const Center(
            child: Icon(Icons.broken_image, color: Colors.white, size: 16)),
      ),
    );

    if (quarterTurns != 0) {
      img = RotatedBox(quarterTurns: quarterTurns, child: img);
    }

    if (itemName == 'csot 1' || itemName == 'csot 2') {
      img = Stack(
        alignment: Alignment.center,
        children: [
          img,
          Text(
            itemName.toUpperCase(),
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      );
    }

    return GestureDetector(
      onTap: () => _showForm(context, item),
      child: img,
    );
  }

  Widget _buildSeatLabel(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade400, width: 1.5),
      ),
      child: Text(
        text,
        style: GoogleFonts.poppins(
          fontWeight: FontWeight.w900,
          color: Colors.black,
          fontSize: 12,
        ),
      ),
    );
  }

  // ─── HELPER: kotak toilet visual — landscape (tidak bisa diklik) ───────────
  Widget _buildToiletBox(double width, double height) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.85),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.grey.shade600, width: 1.2),
      ),
      child: Center(
        child: Text(
          'Toilet',
          style: GoogleFonts.poppins(
            fontSize: 8,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
      ),
    );
  }

  // ─── HELPER: kotak label generik — landscape ─────────────────────────────
  Widget _buildLabelBox(String label, double width, double height) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.85),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.grey.shade600, width: 1.2),
      ),
      child: Center(
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 8,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
      ),
    );
  }

  // ─── HELPER: tombol Panel PIDS — compact untuk strip atas ─────────────────
  Widget _buildPanelPidsButton(BuildContext context) {
    final panelItems = <String>[
      'nvr',
      'mini PC',
      'router(antar gerbong)',
      'switch hub',
      'modem'
    ];

    bool isSemuaAwal = true;
    bool isSemuaBaik = true;
    bool adaRusak = false;
    bool adaTiada = false;

    for (final name in panelItems) {
      final fullName = 'Panel PIDS - $name';
      var item = gerbong.inspeksiItems.firstWhere(
        (i) => i.nama == fullName,
        orElse: () => InspeksiItem(nama: '', status: 'NOT_FOUND'),
      );

      if (item.status == 'NOT_FOUND') {
        item = InspeksiItem(nama: fullName, status: 'AWAL');
        gerbong.inspeksiItems.add(item);
      }

      if (item.status != 'AWAL') isSemuaAwal = false;
      if (item.status != 'BAIK') isSemuaBaik = false;
      if (item.status == 'RUSAK') adaRusak = true;
      if (item.status == 'TIADA') adaTiada = true;
    }

    Color bgColor = Colors.grey[850]!;
    Color textColor = Colors.white;

    if (adaRusak) {
      bgColor = const Color(0xFFE74C3C); // Merah
      textColor = Colors.white;
    } else if (adaTiada) {
      bgColor = Colors.grey;
      textColor = Colors.white;
    } else if (isSemuaBaik && !isSemuaAwal) {
      bgColor = const Color(0xFF27AE60); // Hijau
      textColor = Colors.white;
    }

    return GestureDetector(
      onTap: () => _showPanelPidsForm(context),
      child: Container(
        width: 100,
        height: 35,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.grey.shade600, width: 1.2),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                border: Border.all(color: textColor, width: 1),
                borderRadius: BorderRadius.circular(2),
              ),
              child: Center(
                child: Container(width: 4, height: 4, color: textColor),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              'Panel PIDS',
              style: GoogleFonts.poppins(
                fontSize: 8,
                fontWeight: FontWeight.bold,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── HELPER: tampilkan form inspeksi Panel PIDS ─────────────────────────────
  void _showPanelPidsForm(BuildContext context) {
    final panelItems = <String>[
      'nvr',
      'mini PC',
      'router(antar gerbong)',
      'switch hub',
      'modem'
    ];

    // (Items are already initialized in _buildPanelPidsButton, so we don't need to do it here)

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.blueGrey[900]!,
      builder: (ctx) => _PanelPidsBottomSheet(
        gerbong: gerbong,
        panelItems: panelItems,
        onSave: onUpdate,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFE2E2E2),
        image: const DecorationImage(
          image: AssetImage('assets/Background.png'),
          fit: BoxFit.cover,
        ),
        borderRadius: BorderRadius.circular(30),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final mw = constraints.maxWidth;
          final mh = constraints.maxHeight;

          return Stack(
            children: [
              // ── Router (tengah gerbong / WiFi) ───────────────────────────
              Positioned(
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                child: Center(
                    child: _buildImageItem(
                        context, 'AP', 'assets/Router_Awal.png', 43, 66)),
              ),

              // ── Rti1 — PIDS atas (dimajukan ke dalam 24px) ───────────────
              Positioned(
                top: 45,
                left: 0,
                right: 0, // geser ke kiri sedikit lagi
                child: Center(
                  child: _buildImageItem(context, 'Rti1',
                      'assets/RTI_1_AWAL.png', 295, 25),
                ),
              ),

              // ── Panel PIDS — kiri atas (belakang Rti2) ───────────────────
              Positioned(
                top: 1,
                left: mw * 0.125, // geser ke kanan sedikit lagi
                child: _buildPanelPidsButton(context),
              ),

              // P Dist - kanan atas (tepi luar, belakang Rti1)
              Positioned(
                top: 1,
                right: mw * 0.14,
                child: _buildLabelBox('P Dist', 100, 35),
              ),

              // ── CCTV Belakang ────────────────────────────────────────────
              Positioned(
                top: mh * 0.18,
                left: 0,
                right: 0,
                child: Center(
                    child: _buildImageItem(context, 'cam 2',
                        'assets/CCTV_AWAL.png', 50, 37)),
              ),

              // csot 1 (kanan atas - dimajukan ke bawah agar tidak nabrak Rti1)
              Positioned(
                top: 75,
                right: mw * 0.15,
                child: _buildImageItem(
                    context, 'csot 1', 'assets/PIDS_TV_AWAL.png', 89, 56),
              ),

              // ── Rto L — running text sisi kiri ──────────────────────────
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                child: Center(
                    child: _buildImageItem(
                        context, 'Rto L', 'assets/RTOL_AWAL.png', 350, 38, 3)),
              ),

              // ── Rto R — running text sisi kanan ─────────────────────────
              Positioned(
                right: 0,
                top: 0,
                bottom: 0,
                child: Center(
                    child: _buildImageItem(
                        context, 'Rto R', 'assets/RTOR_AWAL.png', 350, 38, 1)),
              ),

              // ── CCTV Depan ───────────────────────────────────────────────
              Positioned(
                bottom: mh * 0.18,
                left: 0,
                right: 0,
                child: Center(
                    child: _buildImageItem(context, 'cam 1',
                        'assets/CCTV_AWAL.png', 50, 37, 2)),
              ),

              // csot 2 (kiri bawah - dimajukan ke atas agar tidak nabrak Rti2)
              Positioned(
                bottom: 75,
                left: mw * 0.15,
                child: _buildImageItem(
                    context, 'csot 2', 'assets/PIDS_TV_AWAL.png', 89, 56),
              ),

              // ── Rti2 — PIDS bawah ────────────────────────────────────────
              Positioned(
                bottom: 45,
                left: 0,
                right: 0, // geser ke kiri sedikit lagi
                child: Center(
                  child: _buildImageItem(
                      context, 'Rti2', 'assets/RTI_2_AWAL.png', 295, 25),
                ),
              ),

              // Toilet kiri bawah (tepi luar, belakang Rti2)
              Positioned(
                bottom: 1,
                left: mw * 0.135, // geser ke tengah sedikit lagi
                child: _buildToiletBox(100, 35),
              ),

              // Toilet kanan bawah (tepi luar, belakang Rti2)
              Positioned(
                bottom: 1,
                right: mw * 0.14, // geser ke tengah sedikit lagi
                child: _buildToiletBox(100, 35),
              ),

              // ── Kursi AB ─────────────────────────────────────────────────
              Positioned(
                top: 135,
                bottom: 135,
                left: mw * 0.15,
                child: Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildSeatLabel('TD BESAR'),
                      const SizedBox(height: 4),
                      Image.asset(
                        'assets/Kursi_Nomer_AB.png',
                        width: 85,
                        height: 300,
                        fit: BoxFit.fill,
                        errorBuilder: (context, error, stackTrace) => Container(
                          width: 85,
                          height: 300,
                          color: Colors.red.withOpacity(0.3),
                          child: const Center(
                            child: Icon(Icons.broken_image,
                                color: Colors.white, size: 16),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Opacity(
                        opacity: 0.0,
                        child: _buildSeatLabel('TD KECIL'),
                      ),
                    ],
                  ),
                  ),
                ),
              ),

              // ── Kursi CD ─────────────────────────────────────────────────
              Positioned(
                top: 135,
                bottom: 135,
                right: mw * 0.15,
                child: Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Opacity(
                        opacity: 0.0,
                        child: _buildSeatLabel('TD BESAR'),
                      ),
                      const SizedBox(height: 4),
                      Image.asset(
                        'assets/Kursi_Nomer_CD.png',
                        width: 85,
                        height: 300,
                        fit: BoxFit.fill,
                        errorBuilder: (context, error, stackTrace) => Container(
                          width: 85,
                          height: 300,
                          color: Colors.red.withOpacity(0.3),
                          child: const Center(
                            child: Icon(Icons.broken_image,
                                color: Colors.white, size: 16),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      _buildSeatLabel('TD KECIL'),
                    ],
                  ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Panel PIDS Bottom Sheet
// ═══════════════════════════════════════════════════════════════════════════
class _PanelPidsBottomSheet extends StatefulWidget {
  final Gerbong gerbong;
  final List<String> panelItems;
  final VoidCallback onSave;

  const _PanelPidsBottomSheet({
    required this.gerbong,
    required this.panelItems,
    required this.onSave,
  });

  @override
  State<_PanelPidsBottomSheet> createState() => _PanelPidsBottomSheetState();
}

class _PanelPidsBottomSheetState extends State<_PanelPidsBottomSheet> {
  final Map<String, TextEditingController> _descControllers = {};

  @override
  void initState() {
    super.initState();
    // Initialize controllers for each item
    for (final name in widget.panelItems) {
      final item = _getItem(name);
      _descControllers[name] = TextEditingController(text: item.deskripsiKerusakan ?? '');
    }
  }

  @override
  void dispose() {
    for (final controller in _descControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  InspeksiItem _getItem(String name) {
    final fullName = 'Panel PIDS - $name';
    return widget.gerbong.inspeksiItems.firstWhere(
      (i) => i.nama == fullName,
      orElse: () {
        final newItem = InspeksiItem(nama: fullName, status: 'AWAL');
        widget.gerbong.inspeksiItems.add(newItem);
        return newItem;
      },
    );
  }

  void _setStatus(InspeksiItem item, String status) {
    setState(() => item.status = status);
  }

  void _save() {
    for (final name in widget.panelItems) {
      final item = _getItem(name);
      if (item.status == 'AWAL') item.status = 'BAIK';
      
      // Save description if RUSAK
      item.deskripsiKerusakan = item.status == 'RUSAK' ? _descControllers[name]?.text : null;
    }
    widget.onSave();
    Navigator.pop(context);
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'BAIK':
        return const Color(0xFF27AE60);
      case 'RUSAK':
        return const Color(0xFFE74C3C);
      case 'TIADA':
        return Colors.grey;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 50,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Icon(Icons.developer_board,
                    color: Color(0xFF003058), size: 22),
                const SizedBox(width: 8),
                Text(
                  'Inspeksi Panel PIDS',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF003058),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Periksa kondisi setiap perangkat di dalam Panel PIDS',
              style: GoogleFonts.poppins(
                  fontSize: 12, color: Colors.grey.shade600),
            ),
            const Divider(height: 28),
            ...widget.panelItems.map((name) {
              final item = _getItem(name);
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF1A1A2E),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: ['BAIK', 'TIADA', 'RUSAK'].map((status) {
                        final isSelected = item.status == status;
                        final color = _statusColor(status);
                        return Expanded(
                          child: GestureDetector(
                            onTap: () {
                              _setStatus(item, status);
                              if (status != 'RUSAK') {
                                _descControllers[name]?.clear();
                              }
                            },
                            child: Container(
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? color.withOpacity(0.15)
                                    : Colors.grey.shade100,
                                border: Border.all(
                                  color:
                                      isSelected ? color : Colors.transparent,
                                  width: 2,
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                status,
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.normal,
                                  color:
                                      isSelected ? color : Colors.grey.shade500,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    if (item.status == 'RUSAK') ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: _descControllers[name],
                        maxLines: 1,
                        decoration: InputDecoration(
                          hintText: 'Deskripsi kerusakan $name...',
                          hintStyle: GoogleFonts.poppins(
                            fontSize: 12,
                            color: Colors.grey.shade400,
                          ),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          contentPadding: const EdgeInsets.all(12),
                        ),
                        style: GoogleFonts.poppins(fontSize: 13),
                      ),
                    ],
                  ],
                ),
              );
            }).toList(),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF003058),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                child: Text(
                  'Simpan',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BottomSheetForm extends StatefulWidget {
  final InspeksiItem item;
  final VoidCallback onSave;

  const _BottomSheetForm({required this.item, required this.onSave});

  @override
  State<_BottomSheetForm> createState() => _BottomSheetFormState();
}

class _BottomSheetFormState extends State<_BottomSheetForm> {
  String _status = 'AWAL';
  final TextEditingController _descController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _status = widget.item.status;
    _descController.text = widget.item.deskripsiKerusakan ?? '';
  }

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  void _save() {
    if (_status == 'AWAL') {
      _status = 'BAIK';
    }
    widget.item.status = _status;
    widget.item.deskripsiKerusakan =
        _status == 'RUSAK' ? _descController.text : null;
    widget.onSave();
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: AplikasiTheme.cardWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 50,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Inspeksi ${widget.item.nama}',
              style: AplikasiTheme.headingMedium,
            ),
            const SizedBox(height: 24),
            Text('Kondisi', style: AplikasiTheme.headingSmall),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                    child:
                        _buildStatusOption('BAIK', AplikasiTheme.statusBaik)),
                const SizedBox(width: 8),
                Expanded(child: _buildStatusOption('TIADA', Colors.grey)),
                const SizedBox(width: 8),
                Expanded(
                    child:
                        _buildStatusOption('RUSAK', AplikasiTheme.statusRusak)),
              ],
            ),
            if (_status == 'RUSAK') ...[
              const SizedBox(height: 20),
              Text('Deskripsi Kerusakan', style: AplikasiTheme.headingSmall),
              const SizedBox(height: 8),
              TextField(
                controller: _descController,
                maxLines: 2,
                decoration:
                    AplikasiTheme.inputFieldDecoration('Masukkan deskripsi...'),
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AplikasiTheme.primaryBlue,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                child: Text('Simpan',
                    style:
                        AplikasiTheme.buttonText.copyWith(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusOption(String title, Color color) {
    final isSelected = _status == title;
    return GestureDetector(
      onTap: () => setState(() => _status = title),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color:
              isSelected ? color.withOpacity(0.15) : AplikasiTheme.surfaceGrey,
          border: Border.all(
            color: isSelected ? color : Colors.transparent,
            width: 2,
          ),
          borderRadius: BorderRadius.circular(15),
        ),
        alignment: Alignment.center,
        child: Text(
          title,
          style: AplikasiTheme.bodyLarge.copyWith(
            color: isSelected ? color : AplikasiTheme.textLight,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _BottomSheetCctvForm extends StatefulWidget {
  final InspeksiItem itemCctv;
  final String itemName;
  final VoidCallback onSave;

  const _BottomSheetCctvForm({
    required this.itemCctv,
    required this.itemName,
    required this.onSave,
  });

  @override
  State<_BottomSheetCctvForm> createState() => _BottomSheetCctvFormState();
}

class _BottomSheetCctvFormState extends State<_BottomSheetCctvForm> {
  String _statusCctv = 'AWAL';
  final TextEditingController _descCctvController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _statusCctv = widget.itemCctv.status;
    _descCctvController.text = widget.itemCctv.deskripsiKerusakan ?? '';
  }

  @override
  void dispose() {
    _descCctvController.dispose();
    super.dispose();
  }

  void _save() {
    if (_statusCctv == 'AWAL') {
      _statusCctv = 'BAIK';
    }

    widget.itemCctv.status = _statusCctv;
    widget.itemCctv.deskripsiKerusakan =
        _statusCctv == 'RUSAK' ? _descCctvController.text : null;

    widget.onSave();
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: AplikasiTheme.cardWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 50,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Inspeksi ${widget.itemName}',
              style: AplikasiTheme.headingMedium,
            ),
            const SizedBox(height: 24),

            Text('Kondisi Kamera', style: AplikasiTheme.headingSmall),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildStatusOption('BAIK', AplikasiTheme.statusBaik)),
                const SizedBox(width: 8),
                Expanded(child: _buildStatusOption('TIADA', Colors.grey)),
                const SizedBox(width: 8),
                Expanded(child: _buildStatusOption('RUSAK', AplikasiTheme.statusRusak)),
              ],
            ),
            if (_statusCctv == 'RUSAK') ...[
              const SizedBox(height: 12),
              TextField(
                controller: _descCctvController,
                maxLines: 1,
                decoration: AplikasiTheme.inputFieldDecoration('Deskripsi kerusakan kamera...'),
              ),
            ],

            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AplikasiTheme.primaryBlue,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                child: Text('Simpan',
                    style: AplikasiTheme.buttonText.copyWith(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusOption(String title, Color color) {
    final isSelected = _statusCctv == title;
    return GestureDetector(
      onTap: () {
        setState(() {
          _statusCctv = title;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : AplikasiTheme.surfaceGrey,
          border: Border.all(
            color: isSelected ? color : Colors.transparent,
            width: 2,
          ),
          borderRadius: BorderRadius.circular(15),
        ),
        alignment: Alignment.center,
        child: Text(
          title,
          style: AplikasiTheme.bodyLarge.copyWith(
            color: isSelected ? color : AplikasiTheme.textLight,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
