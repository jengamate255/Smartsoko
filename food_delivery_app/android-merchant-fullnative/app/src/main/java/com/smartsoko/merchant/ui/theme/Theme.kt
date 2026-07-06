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
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF10B981),
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = androidx.compose.ui.graphics.Color(0xFFD1FAE5),
    onPrimaryContainer = androidx.compose.ui.graphics.Color(0xFF065F46),
    secondary = androidx.compose.ui.graphics.Color(0xFF059669),
    onSecondary = androidx.compose.ui.graphics.Color.White,
    tertiary = androidx.compose.ui.graphics.Color(0xFFF59E0B),
    onTertiary = androidx.compose.ui.graphics.Color.White,
    error = androidx.compose.ui.graphics.Color(0xFFEF4444),
    onError = androidx.compose.ui.graphics.Color.White,
    background = androidx.compose.ui.graphics.Color(0xFFF9FAFB),
    onBackground = androidx.compose.ui.graphics.Color(0xFF111827),
    surface = androidx.compose.ui.graphics.Color.White,
    onSurface = androidx.compose.ui.graphics.Color(0xFF111827),
)

private val DarkColorScheme = darkColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF34D399),
    onPrimary = androidx.compose.ui.graphics.Color(0xFF064E3B),
    primaryContainer = androidx.compose.ui.graphics.Color(0xFF065F46),
    onPrimaryContainer = androidx.compose.ui.graphics.Color(0xFF6EE7B7),
    secondary = androidx.compose.ui.graphics.Color(0xFF6EE7B7),
    onSecondary = androidx.compose.ui.graphics.Color(0xFF064E3B),
    tertiary = androidx.compose.ui.graphics.Color(0xFFFBBF24),
    onTertiary = androidx.compose.ui.graphics.Color(0xFF92400E),
    error = androidx.compose.ui.graphics.Color(0xFFFCA5A5),
    onError = androidx.compose.ui.graphics.Color(0xFF7F1D1D),
    background = androidx.compose.ui.graphics.Color(0xFF111827),
    onBackground = androidx.compose.ui.graphics.Color(0xFFF9FAFB),
    surface = androidx.compose.ui.graphics.Color(0xFF1F2937),
    onSurface = androidx.compose.ui.graphics.Color(0xFFF9FAFB),
)

@Composable
fun SmartSokoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
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
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
