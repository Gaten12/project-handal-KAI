import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'theme/aplikasi_theme.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Enable runtime font fetching so Poppins-Medium can be loaded
  GoogleFonts.config.allowRuntimeFetching = true;

  // Set status bar to transparent for seamless gradient
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF4B6CB7),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const SiparkaApp());
}

class SiparkaApp extends StatelessWidget {
  const SiparkaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIPARKA',
      debugShowCheckedModeBanner: false,
      theme: AplikasiTheme.themeData,
      home: const SplashScreen(),
    );
  }
}
