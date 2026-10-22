import 'package:flutter/material.dart';

class AppColors {
  // Brand Primary & Accents (Vibrant Electric Blue & Cyan matched to App Logo)
  static const Color primary = Color(0xFF0066FF);       // Electric Blue 600
  static const Color primaryLight = Color(0xFF00D2FF);  // Cyan 400
  static const Color primaryDark = Color(0xFF0047BA);   // Deep Blue 800
  static const Color primaryContainer = Color(0xFFEFF6FF); // Soft Ice Blue 50
  
  static const Color secondary = Color(0xFF0284C7);     // Sky 600
  static const Color secondaryContainer = Color(0xFFE0F2FE);

  // Mint / Green Accent (from logo base)
  static const Color accentMint = Color(0xFF10B981);    // Emerald / Mint 500
  static const Color accentMintContainer = Color(0xFFECFDF5);

  // Status & Feedback Colors
  static const Color success = Color(0xFF10B981);       // Emerald 500
  static const Color successContainer = Color(0xFFECFDF5);
  
  static const Color warning = Color(0xFFF59E0B);       // Amber 500
  static const Color warningContainer = Color(0xFFFEF3C7);
  
  static const Color error = Color(0xFFEF4444);         // Red 500
  static const Color errorContainer = Color(0xFFFEE2E2);

  static const Color info = Color(0xFF0066FF);          // Blue
  static const Color infoContainer = Color(0xFFDBEAFE);

  // Neutral Background & Surfaces (Clean Slate Aesthetic)
  static const Color background = Color(0xFFF8FAFC);    // Slate 50
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFFFFFFF);
  static const Color cardBackground = Color(0xFFF8FAFC); // Slate 50
  static const Color cardBorder = Color(0xFFE2E8F0);    // Slate 200

  // Text & Typography
  static const Color textPrimary = Color(0xFF0F172A);   // Slate 900
  static const Color textSecondary = Color(0xFF64748B); // Slate 500
  static const Color textTertiary = Color(0xFF94A3B8);  // Slate 400
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // Gradients for Modern Cards & Primary CTA Buttons
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0066FF), Color(0xFF00B4D8)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient logoGradient = LinearGradient(
    colors: [Color(0xFF0066FF), Color(0xFF00D2FF)],
    begin: Alignment.topCenter,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardGlowGradient = LinearGradient(
    colors: [Color(0xFFFFFFFF), Color(0xFFF8FAFC)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
