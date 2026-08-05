package com.fooddelivery.driver.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val DarkColors = darkColorScheme(
    primary = Color(0xFF6B9080),
    onPrimary = Color.White,
    secondary = Color(0xFFD4AF37),
    onSecondary = Color.White,
    tertiary = Color(0xFFFFB74D),
    onTertiary = Color.Black,
    background = Color(0xFF020617),
    onBackground = Color.White,
    surface = Color(0xFF020617),
    onSurface = Color.White,
    error = Color(0xFFF44336),
    onError = Color.White
)

private val LightColors = lightColorScheme(
    primary = Color(0xFF00695C),
    onPrimary = Color.White,
    secondary = Color(0xFFFFB300),
    onSecondary = Color.White,
    tertiary = Color(0xFF607D8B),
    onTertiary = Color.White,
    background = Color.White,
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black,
    error = Color(0xFFB00020),
    onError = Color.White
)

@Composable
fun SmartSokoDriverColors(): ColorScheme {
    return if (isSystemInDarkTheme()) DarkColors else LightColors
}

@Composable
fun SmartSokoDriverTheme(
    /* Use this parameter to change the dark colors */
    darkColors: ColorScheme = DarkColors,
    /* Use this parameter to change the light colors */
    lightColors: ColorScheme = LightColors,
    /* Set content color to follow the preferred 'on' color of the primary color */
    content: @Composable () -> Unit
) {
    val colors = if (isSystemInDarkTheme()) darkColors else lightColors
    MaterialTheme(
        colorScheme = colors,
        content = content
    )
}

@Composable
fun SmartSokoDriverTypography() = androidx.compose.material3.Typography()

@Composable
fun SmartSokoDriverShapes() = androidx.compose.material3.Shapes()