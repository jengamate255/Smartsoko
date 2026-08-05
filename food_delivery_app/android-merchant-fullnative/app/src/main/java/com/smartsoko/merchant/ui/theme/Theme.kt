package com.smartsoko.merchant.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF064E3B),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD1FAE5),
    onPrimaryContainer = Color(0xFF022D1D),
    secondary = Color(0xFF059669),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFA7F3D0),
    onSecondaryContainer = Color(0xFF00210C),
    tertiary = Color(0xFF0EA5E9),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFBAE6FD),
    onTertiaryContainer = Color(0xFF001E31),
    error = Color(0xFFB91C1C),
    onError = Color.White,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF410002),
    background = Color(0xFFF8FAF6),
    onBackground = Color(0xFF022D1D),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF022D1D),
    surfaceVariant = Color(0xFFECFDF5),
    onSurfaceVariant = Color(0xFF64748B),
    outline = Color(0xFFCBD5E1),
    outlineVariant = Color(0xFFE2E8F0),
    inverseSurface = Color(0xFF022D1D),
    inverseOnSurface = Color(0xFFE8F2FF),
    inversePrimary = Color(0xFF6EE7B7),
    surfaceTint = Color(0xFF064E3B),
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF6EE7B7),
    onPrimary = Color(0xFF022D1D),
    primaryContainer = Color(0xFF064E3B),
    onPrimaryContainer = Color(0xFFD1FAE5),
    secondary = Color(0xFF34D399),
    onSecondary = Color(0xFF00210C),
    secondaryContainer = Color(0xFF059669),
    onSecondaryContainer = Color(0xFFA7F3D0),
    tertiary = Color(0xFF7DD3FC),
    onTertiary = Color(0xFF003552),
    tertiaryContainer = Color(0xFF0EA5E9),
    onTertiaryContainer = Color(0xFFBAE6FD),
    error = Color(0xFFFCA5A5),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFEE2E2),
    background = Color(0xFF0B1410),
    onBackground = Color(0xFFE8F2FF),
    surface = Color(0xFF0F1B16),
    onSurface = Color(0xFFE8F2FF),
    surfaceVariant = Color(0xFF1A2B23),
    onSurfaceVariant = Color(0xFFCBD5E1),
    outline = Color(0xFF3F5147),
    outlineVariant = Color(0xFF1A2B23),
    inverseSurface = Color(0xFFE8F2FF),
    inverseOnSurface = Color(0xFF0F1B16),
    inversePrimary = Color(0xFF064E3B),
    surfaceTint = Color(0xFF6EE7B7),
)

@Composable
fun SmartSokoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
