package com.fooddelivery.driver.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.Shapes
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Light color scheme - Tanzania brand colors
private val LightColors = lightColorScheme(
    // Primary - Tanzania Orange
    primary = Color(0xFFFF6B00),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFE5D0),
    onPrimaryContainer = Color(0xFF3D1C00),
    
    // Secondary - Tanzania Green
    secondary = Color(0xFF1B8A3C),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD0F0D8),
    onSecondaryContainer = Color(0xFF00220B),
    
    // Tertiary - Amber for accents
    tertiary = Color(0xFFF59E0B),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFFF3E0),
    onTertiaryContainer = Color(0xFF3D2C00),
    
    // Error
    error = Color(0xFFDC2626),
    onError = Color.White,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF450A0A),
    
    // Background & Surface
    background = Color(0xFFFAFAFA),
    onBackground = Color(0xFF1C1C1C),
    surface = Color.White,
    onSurface = Color(0xFF1C1C1C),
    surfaceVariant = Color(0xFFF5F5F5),
    onSurfaceVariant = Color(0xFF4A4A4A),
    
    // Outline
    outline = Color(0xFFE0E0E0),
    outlineVariant = Color(0xFFE0E0E0),
    
    // Inverse
    inverseSurface = Color(0xFF313131),
    inversePrimary = Color(0xFFFF9500),
    
    // Scrim
    scrim = Color(0x75000000),
    
    // Surface tint
    surfaceTint = Color(0xFFFF6B00),
)

// Dark color scheme
private val DarkColors = darkColorScheme(
    // Primary - Tanzania Orange (lighter for dark mode)
    primary = Color(0xFFFF9500),
    onPrimary = Color(0xFF3D1C00),
    primaryContainer = Color(0xFF3D1C00),
    onPrimaryContainer = Color(0xFFFFE5D0),
    
    // Secondary - Tanzania Green (lighter for dark mode)
    secondary = Color(0xFF4CAF50),
    onSecondary = Color(0xFF00220B),
    secondaryContainer = Color(0xFF00220B),
    onSecondaryContainer = Color(0xFFD0F0D8),
    
    // Tertiary - Amber
    tertiary = Color(0xFFFFB74D),
    onTertiary = Color(0xFF3D2C00),
    tertiaryContainer = Color(0xFF3D2C00),
    onTertiaryContainer = Color(0xFFFFF3E0),
    
    // Error
    error = Color(0xFFEF4444),
    onError = Color(0xFF450A0A),
    errorContainer = Color(0xFF450A0A),
    onErrorContainer = Color(0xFFFEE2E2),
    
    // Background & Surface
    background = Color(0xFF121212),
    onBackground = Color(0xFFE6E6E6),
    surface = Color(0xFF1E1E1E),
    onSurface = Color(0xFFE6E6E6),
    surfaceVariant = Color(0xFF2C2C2C),
    onSurfaceVariant = Color(0xFFCACACA),
    
    // Outline
    outline = Color(0xFF444444),
    outlineVariant = Color(0xFF444444),
    
    // Inverse
    inverseSurface = Color(0xFFE6E6E6),
    inversePrimary = Color(0xFFFF6B00),
    
    // Scrim
    scrim = Color(0x75000000),
    
    // Surface tint
    surfaceTint = Color(0xFFFF9500),
)

// Typography with Inter font family
private val Typography = Typography(
    // Display styles
    displayLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 57.sp,
        lineHeight = 64.sp,
        letterSpacing = -0.25.sp,
    ),
    displayMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 45.sp,
        lineHeight = 52.sp,
        letterSpacing = 0.sp,
    ),
    displaySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 36.sp,
        lineHeight = 44.sp,
        letterSpacing = 0.sp,
    ),
    
    // Headline styles
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        letterSpacing = 0.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 36.sp,
        letterSpacing = 0.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 32.sp,
        letterSpacing = 0.sp,
    ),
    
    // Title styles
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = 0.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    
    // Body styles
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.4.sp,
    ),
    
    // Label styles
    labelLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp,
    ),
)

// Shapes with rounded corners
private val Shapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
)

@Composable
fun SmartSokoDriverTheme(
    /* Use this parameter to change the dark colors */
    darkColors: androidx.compose.material3.ColorScheme = DarkColors,
    /* Use this parameter to change the light colors */
    lightColors: androidx.compose.material3.ColorScheme = LightColors,
    /* Set content color to follow the preferred 'on' color of the primary color */
    content: @Composable () -> Unit
) {
    val colors = if (isSystemInDarkTheme()) darkColors else lightColors
    MaterialTheme(
        colorScheme = colors,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}