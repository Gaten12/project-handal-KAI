import 'package:flutter/material.dart';
import 'home_screen.dart';
import '../theme/splash_screen_theme.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _whiteBgScale;
  late Animation<double> _coloredLogoOpacity;
  late Animation<double> _whiteLogoOpacity;
  late Animation<double> _textWidth;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 3500),
      vsync: this,
    );

    // Fase 1 & 2: Background Putih menyusut (0.05 sampai 0.35)
    _whiteBgScale = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.05, 0.35, curve: Curves.easeInOut),
      ),
    );

    // Fase 3: Logo Berwarna fade out (0.35 sampai 0.45)
    _coloredLogoOpacity = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.35, 0.45, curve: Curves.easeOut),
      ),
    );

    // Fase 3: Logo Putih fade in (0.35 sampai 0.45)
    _whiteLogoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.35, 0.45, curve: Curves.easeIn),
      ),
    );

    // Fase 4 & 5: Text muncul & Logo bergeser (0.55 sampai 0.85)
    _textWidth = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.55, 0.85, curve: Curves.easeOutCubic),
      ),
    );

    _controller.forward().then((_) {
      // Tunggu sebentar setelah animasi selesai sebelum pindah ke HomeScreen
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          ApiService.isLoggedIn().then((isLoggedIn) {
            if (mounted) {
              Navigator.of(context).pushReplacement(
                PageRouteBuilder(
                  pageBuilder: (context, animation, secondaryAnimation) =>
                      isLoggedIn ? const HomeScreen() : LoginScreen(),
                  transitionsBuilder:
                      (context, animation, secondaryAnimation, child) {
                    return FadeTransition(opacity: animation, child: child);
                  },
                  transitionDuration: const Duration(milliseconds: 600),
                ),
              );
            }
          });
        }
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const double logoSize = 100.0;

    return Scaffold(
      body: Stack(
        children: [
          // 1. Background Gradient dan Motif Lingkaran (dari Theme)
          const SplashScreenBackground(),

          // 3. Lingkaran putih yang menutupi layar dan menyusut
          Center(
            child: AnimatedBuilder(
              animation: _whiteBgScale,
              builder: (context, child) {
                return Transform.scale(
                  scale: _whiteBgScale.value,
                  child: Container(
                    // Ukuran awal yang sangat besar untuk menutupi seluruh layar HP
                    width: 3000,
                    height: 3000,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                );
              },
            ),
          ),

          // 3. Layer Logo dan Text
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Logo (Crossfade Berwarna -> Putih)
                SizedBox(
                  width: logoSize,
                  height: logoSize,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Logo Putih (berada di bawah agar logo berwarna fade out menutupi ini saat awal)
                      AnimatedBuilder(
                        animation: _whiteLogoOpacity,
                        builder: (context, child) => Opacity(
                          opacity: _whiteLogoOpacity.value,
                          child: child,
                        ),
                        child: Image.asset(
                          'assets/Logo_Aplikasi_Putih.png',
                          width: logoSize,
                          height: logoSize,
                          fit: BoxFit.contain,
                        ),
                      ),
                      // Logo Berwarna (tampil awal, lalu memudar)
                      AnimatedBuilder(
                        animation: _coloredLogoOpacity,
                        builder: (context, child) => Opacity(
                          opacity: _coloredLogoOpacity.value,
                          child: child,
                        ),
                        child: Image.asset(
                          'assets/Logo_Aplikasi_Biru.png',
                          width: logoSize,
                          height: logoSize,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ],
                  ),
                ),

                // Text Reveal dari Kiri ke Kanan
                AnimatedBuilder(
                  animation: _textWidth,
                  builder: (context, child) {
                    return ClipRect(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        widthFactor: _textWidth.value,
                        child: Padding(
                          padding: const EdgeInsets.only(left: 16.0),
                          child: Image.asset(
                            'assets/Logo Text Putih.png',
                            height:
                                50, // Sesuaikan tinggi text agar proporsional
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
