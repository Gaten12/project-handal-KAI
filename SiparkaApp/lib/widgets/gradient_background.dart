import 'package:flutter/material.dart';
import '../theme/aplikasi_theme.dart';

class GradientBackground extends StatelessWidget {
  final Widget child;
  final bool useSafeArea;

  const GradientBackground({
    super.key,
    required this.child,
    this.useSafeArea = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: AplikasiTheme.backgroundGradient,
      ),
      child: useSafeArea
          ? SafeArea(child: child)
          : child,
    );
  }
}
