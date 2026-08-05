package com.smartsoko.driver.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = Teal700,
    onPrimary = Grey50,
    primaryContainer = Teal200,
    secondary = Amber700,
    onSecondary = Grey900,
    tertiary = Blue500,
    background = Grey50,
    onBackground = Grey900,
    surface = Grey50,
    onSurface = Grey900,
    surfaceVariant = Grey100,
    onSurfaceVariant = Grey800,
    error = Red500,
    onError = Grey50,
    outline = Grey200
)

private val DarkColorScheme = darkColorScheme(
    primary = Teal500,
    onPrimary = Grey50,
    primaryContainer = Teal700,
    secondary = Amber500,
    onSecondary = Grey900,
    tertiary = Blue500,
    background = DarkBackground,
    onBackground = Grey50,
    surface = DarkSurface,
    onSurface = Grey50,
    surfaceVariant = DarkCard,
    onSurfaceVariant = Grey200,
    error = Red500,
    onError = Grey50,
    outline = Grey800
)

@Composable
fun SmartSokoDriverTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
