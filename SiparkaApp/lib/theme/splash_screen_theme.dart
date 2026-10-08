import 'package:flutter/material.dart';

class SplashScreenBackground extends StatelessWidget {
  const SplashScreenBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Stack(
        children: [
          // 1. Background Gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF001C36),
                  Color(0xFF00518E),
                ],
              ),
            ),
          ),

          // 2. Motif Lingkaran Background
          // Lingkaran Atas
          Positioned(
            top: -40,
            right: -40,
            child: Container(
              width: 195,
              height: 195,
              decoration: const BoxDecoration(
                color: Color(0xFF0D426D),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            top: -30,
            right: 173,
            child: Container(
              width: 115,
              height: 115,
              decoration: const BoxDecoration(
                color: Color(0xFF0D426D),
                shape: BoxShape.circle,
              ),
            ),
          ),

          // Lingkaran Tengah
          Positioned(
            top: MediaQuery.of(context).size.height * 0.4,
            left: -100,
            child: Container(
              width: 284,
              height: 284,
              decoration: const BoxDecoration(
                color: Color(0xFF0D426D),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).size.height * 0.3,
            left: 212,
            child: Container(
              width: 155,
              height: 155,
              decoration: const BoxDecoration(
                color: Color(0xFF0D426D),
                shape: BoxShape.circle,
              ),
            ),
          ),

          // Lingkaran Bawah
          Positioned(
            bottom: -80,
            right: -40,
            child: Container(
              width: 262,
              height: 262,
              decoration: const BoxDecoration(
                color: Color(0xFF0D426D),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            bottom: 60,
            right: 238, // Jarak 16 px dari lingkaran besar (262 - 40 + 16 = 238)
            child: Container(
              width: 78,
              height: 78,
              decoration: const BoxDecoration(
                color: Color(0xFF0D426D),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
