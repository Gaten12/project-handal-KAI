import 'package:flutter/material.dart';
import '../theme/aplikasi_theme.dart';

class SiparkaHeader extends StatelessWidget {
  final bool showHomeButton;
  final VoidCallback? onHomeTap;

  const SiparkaHeader({
    super.key,
    this.showHomeButton = false,
    this.onHomeTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          // Logo circle
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AplikasiTheme.cardWhite,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Center(
              child: Text(
                'SP',
                style: AplikasiTheme.headingSmall.copyWith(
                  color: AplikasiTheme.orangeStart,
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Title & subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SIPARKA',
                  style: AplikasiTheme.headerTitle,
                ),
                Text(
                  'Sistem Inspeksi Perangkat Kereta Api',
                  style: AplikasiTheme.subtitleText,
                ),
              ],
            ),
          ),
          // Home button removed
        ],
      ),
    );
  }
}
