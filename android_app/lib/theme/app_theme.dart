import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color primaryGreen = Color(0xFF1E4D3B);
  static const Color secondaryGold = Color(0xFFB48C48);
  static const Color lightCanvas = Color(0xFFF7F6F2);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color darkCanvas = Color(0xFF121614);
  static const Color darkSurface = Color(0xFF1A201D);

  static ThemeData lightTheme() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryGreen,
      brightness: Brightness.light,
      primary: primaryGreen,
      secondary: secondaryGold,
      surface: lightSurface,
    );

    final baseText = GoogleFonts.hindSiliguriTextTheme();

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: lightCanvas,
      textTheme: baseText.copyWith(
        headlineMedium: GoogleFonts.notoSerifBengali(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF181C1A),
        ),
        titleLarge: GoogleFonts.notoSerifBengali(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF181C1A),
        ),
        titleMedium: GoogleFonts.hindSiliguri(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: const Color(0xFF181C1A),
        ),
        bodyLarge: GoogleFonts.notoSerifBengali(
          fontSize: 16,
          height: 1.75,
          color: const Color(0xFF1F2421),
        ),
        bodyMedium: GoogleFonts.hindSiliguri(
          fontSize: 14,
          color: const Color(0xFF3E4541),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: lightCanvas,
        foregroundColor: const Color(0xFF181C1A),
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: GoogleFonts.notoSerifBengali(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF181C1A),
        ),
      ),
      cardTheme: CardThemeData(
        color: lightSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFE5E2DA)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: lightSurface,
        indicatorColor: primaryGreen.withOpacity(0.14),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        height: 70,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.hindSiliguri(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? primaryGreen : const Color(0xFF5D6560),
          );
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primaryGreen,
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.hindSiliguri(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: lightSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFDAD6CC)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE5E2DA)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: primaryGreen, width: 1.6),
        ),
      ),
    );
  }

  static ThemeData darkTheme() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryGreen,
      brightness: Brightness.dark,
      primary: const Color(0xFF66B896),
      secondary: secondaryGold,
      surface: darkSurface,
    );

    final baseText = GoogleFonts.hindSiliguriTextTheme(ThemeData.dark().textTheme);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: darkCanvas,
      textTheme: baseText.copyWith(
        headlineMedium: GoogleFonts.notoSerifBengali(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: const Color(0xFFF0EFEA),
        ),
        titleLarge: GoogleFonts.notoSerifBengali(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: const Color(0xFFF0EFEA),
        ),
        bodyLarge: GoogleFonts.notoSerifBengali(
          fontSize: 16,
          height: 1.75,
          color: const Color(0xFFE5E4DE),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: darkCanvas,
        foregroundColor: const Color(0xFFF0EFEA),
        elevation: 0,
        scrolledUnderElevation: 1,
        titleTextStyle: GoogleFonts.notoSerifBengali(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: const Color(0xFFF0EFEA),
        ),
      ),
      cardTheme: CardThemeData(
        color: darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF28312D)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: darkSurface,
        indicatorColor: const Color(0xFF66B896).withOpacity(0.18),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        height: 70,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.hindSiliguri(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? const Color(0xFF81D1AF) : const Color(0xFF9EA6A1),
          );
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFF2B6B52),
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.hindSiliguri(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF313B36)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF28312D)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF66B896), width: 1.6),
        ),
      ),
    );
  }
}
