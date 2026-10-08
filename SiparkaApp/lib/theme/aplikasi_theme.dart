import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AplikasiTheme {
  // Latar belakang orange
  static const BoxDecoration orangeBackground = BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Color(0xFFFF8C00),
        Color(0xFFBA6907),
      ],
    ),
  );

  // Header biru gelap di atas
  static const BoxDecoration blueHeader = BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        Color(0xFF001A33), // Deep Navy
        Color(0xFF003058), // Requested Dark Blue
        Color(0xFF005596), // Bright vibrant blue accent
      ],
    ),
  );

  // Dekorasi lingkaran transparan pada header biru
  static BoxDecoration transparentCircleDecoration = BoxDecoration(
    shape: BoxShape.circle,
    color: Colors.white.withOpacity(0.05),
  );

  // Dekorasi kartu interaktif putih
  static BoxDecoration whiteCardDecoration = BoxDecoration(
    color: Colors.white,
    borderRadius: const BorderRadius.only(
      topLeft: Radius.circular(30),
      topRight: Radius.circular(30),
    ),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.05),
        blurRadius: 20,
        offset: const Offset(0, -5),
      ),
    ],
  );

  // Lingkaran gradien di pojok kanan bawah kartu
  static const BoxDecoration bottomCircleDecoration = BoxDecoration(
    shape: BoxShape.circle,
    gradient: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        Color(0xFF0D426D),
        Color(0xFF1980D3),
      ],
    ),
  );
  
  // Style teks Welcome "Selamat Datang"
  static TextStyle welcomeTitleStyle = GoogleFonts.poppins(
    color: Colors.white,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    height: 1.3,
  );

  // Style teks "Aplikasi untuk mencatat..."
  static TextStyle welcomeSubtitleStyle = GoogleFonts.poppins(
    color: Colors.white.withOpacity(0.8),
    fontSize: 16,
  );
  
  // Style teks "Menu Utama"
  static TextStyle menuUtamaStyle = GoogleFonts.poppins(
    color: const Color(0xFF003058),
    fontSize: 24,
    fontWeight: FontWeight.bold,
  );
  // === GRADIENT COLORS (from wireframe) ===
  static const Color orangeStart = Color(0xFFE8864A);
  static const Color peachMid = Color(0xFFD4967A);
  static const Color blueMid = Color(0xFF8E7FA8);
  static const Color blueEnd = Color(0xFF4B6CB7);

  // === CARD & SURFACE COLORS ===
  static const Color cardWhite = Color(0xFFF5F0EA);
  static const Color cardLight = Color(0xFFF8F4EF);
  static const Color surfaceGrey = Color(0xFFEDE8E2);

  // === TEXT COLORS ===
  static const Color textDark = Color(0xFF1A1A1A);
  static const Color textMedium = Color(0xFF4A4A4A);
  static const Color textLight = Color(0xFF8A8A8A);

  // === ACCENT COLORS ===
  static const Color dangerRed = Color(0xFFE74C3C);
  static const Color successGreen = Color(0xFF2ECC71);
  static const Color statusBaik = Color(0xFF27AE60);
  static const Color statusRusak = Color(0xFFE74C3C);

  // === HOME SCREEN COLORS ===
  static const Color primaryBlue = Color(0xFF0B4C85);

  // === GRADIENT ===
  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [orangeStart, peachMid, blueMid, blueEnd],
    stops: [0.0, 0.3, 0.6, 1.0],
  );

  // === TEXT STYLES ===
  static TextStyle get headingLarge => GoogleFonts.poppins(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: textDark,
  );

  static TextStyle get headingMedium => GoogleFonts.poppins(
    fontSize: 18,
    fontWeight: FontWeight.w700,
    color: textDark,
  );

  static TextStyle get headingSmall => GoogleFonts.poppins(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: textDark,
  );

  static TextStyle get bodyLarge => GoogleFonts.poppins(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    color: textDark,
  );

  static TextStyle get bodyMedium => GoogleFonts.poppins(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: textMedium,
  );

  static TextStyle get bodySmall => GoogleFonts.poppins(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: textLight,
  );

  static TextStyle get buttonText => GoogleFonts.poppins(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: textDark,
  );

  static TextStyle get subtitleText => GoogleFonts.poppins(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: Colors.white70,
  );

  static TextStyle get headerTitle => GoogleFonts.poppins(
    fontSize: 18,
    fontWeight: FontWeight.w800,
    color: Colors.white,
  );

  // === HOME SCREEN TEXT STYLES ===
  static TextStyle get homeWelcomeTitle => GoogleFonts.poppins(
    color: primaryBlue,
    fontSize: 24,
    fontWeight: FontWeight.w900,
    height: 1.2,
  );

  static TextStyle get homeWelcomeSubtitle => GoogleFonts.poppins(
    color: Colors.black.withOpacity(0.7),
    fontSize: 12,
    fontWeight: FontWeight.w500,
  );

  static TextStyle get homeButtonText => GoogleFonts.poppins(
    color: primaryBlue,
    fontSize: 16,
    fontWeight: FontWeight.w700,
  );

  // === DECORATIONS ===
  static BoxDecoration get cardDecoration => BoxDecoration(
    color: cardWhite,
    borderRadius: BorderRadius.circular(20),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.08),
        blurRadius: 12,
        offset: const Offset(0, 4),
      ),
    ],
  );

  // === HOME SCREEN DECORATIONS ===
  static BoxDecoration get glassmorphismCard => BoxDecoration(
    color: Colors.white.withOpacity(0.4),
    borderRadius: BorderRadius.circular(24),
    border: Border.all(
      color: Colors.white.withOpacity(0.5),
      width: 1.5,
    ),
  );

  static BoxDecoration get homeButtonDecoration => BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(12),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.05),
        blurRadius: 10,
        offset: const Offset(0, 4),
      ),
    ],
  );

  static BoxDecoration get inputDecoration => BoxDecoration(
    color: surfaceGrey,
    borderRadius: BorderRadius.circular(25),
  );

  static InputDecoration inputFieldDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.poppins(
        fontSize: 14,
        color: textLight,
      ),
      filled: true,
      fillColor: surfaceGrey,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(25),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
    );
  }

  // === THEME DATA ===
  static ThemeData get themeData => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: orangeStart,
      brightness: Brightness.light,
    ),
    textTheme: GoogleFonts.poppinsTextTheme(),
    scaffoldBackgroundColor: Colors.transparent,
  );
}
// Widget Tombol Interaktif
class AnimatedHomeButton extends StatefulWidget {
  final String text;
  final String iconAsset;
  final VoidCallback onPressed;

  const AnimatedHomeButton({
    super.key,
    required this.text,
    required this.iconAsset,
    required this.onPressed,
  });

  @override
  State<AnimatedHomeButton> createState() => _AnimatedHomeButtonState();
}

class _AnimatedHomeButtonState extends State<AnimatedHomeButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        widget.onPressed();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        width: double.infinity,
        height: 103,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF00213E), Color(0xFF004F8A)],
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: _isPressed 
                  ? const Color(0xFF003058).withOpacity(0.4) 
                  : const Color(0xFF003058).withOpacity(0.08),
              blurRadius: _isPressed ? 10 : 24,
              offset: Offset(0, _isPressed ? 4 : 12),
            ),
          ],
        ),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 63,
              height: 59,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Image.asset(
                widget.iconAsset,
                color: const Color(0xFF00213E),
                width: 38,
                height: 38,
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    widget.text,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              color: Colors.white,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}
