import 'package:flutter/material.dart';
import '../theme/aplikasi_theme.dart';

class RoundedButton extends StatefulWidget {
  final String text;
  final VoidCallback onPressed;
  final bool isPrimary;
  final double? width;
  final IconData? icon;

  const RoundedButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isPrimary = true,
    this.width,
    this.icon,
  });

  @override
  State<RoundedButton> createState() => _RoundedButtonState();
}

class _RoundedButtonState extends State<RoundedButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onPressed();
      },
      onTapCancel: () => _controller.reverse(),
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: child,
          );
        },
        child: Container(
          width: widget.width,
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
          decoration: BoxDecoration(
            color: widget.isPrimary
                ? AplikasiTheme.cardWhite
                : AplikasiTheme.cardWhite.withOpacity(0.7),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.icon != null) ...[
                Icon(widget.icon, color: AplikasiTheme.textDark, size: 20),
                const SizedBox(width: 8),
              ],
              Text(
                widget.text,
                style: AplikasiTheme.buttonText,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bottom navigation bar with "Kembali" and action button
class BottomNavButtons extends StatelessWidget {
  final VoidCallback onBack;
  final VoidCallback onNext;
  final String nextText;

  const BottomNavButtons({
    super.key,
    required this.onBack,
    required this.onNext,
    this.nextText = 'Lanjut',
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        children: [
          Expanded(
            child: RoundedButton(
              text: 'Kembali',
              onPressed: onBack,
              isPrimary: false,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: RoundedButton(
              text: nextText,
              onPressed: onNext,
            ),
          ),
        ],
      ),
    );
  }
}
