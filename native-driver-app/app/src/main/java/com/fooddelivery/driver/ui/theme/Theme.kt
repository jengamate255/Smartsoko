package com.fooddelivery.driver.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp

private val DarkColors = ColorScheme(
    primary = #FF6B9080,
    onPrimary = #FFFFFFFF,
    secondary = #FFD4AF37,
    onSecondary = #FFFFFFFF,
    tertiary = #FFFFB74D,
    onTertiary = #FF000000,
    background = #FF020617,
    onBackground = #FFFFFFFF,
    surface = #FF020617,
    onSurface = #FFFFFFFF,
    error = #FFF44336,
    onError = #FFFFFFFF
)

private val LightColors = ColorScheme(
    primary = #FF00695C,
    onPrimary = #FFFFFFFF,
    secondary = #FFFFB300,
    onSecondary = #FFFFFFFF,
    tertiary = #FF607D8B,
    onTertiary = #FFFFFFFF,
    background = #FFFFFFFF,
    onBackground = #FF000000,
    surface = #FFFFFFFF,
    onSurface = #FF000000,
    error = #FFB00020,
    onError = #FFFFFFFF
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
    contentColor: Color = Color.Unspecified,
    /* Set content to be displayed inside the theme */
    content: @Composable () -> Unit
) {
    val colors = if (isSystemInDarkTheme()) darkColors else lightColors
    androidx.compose.material3.MaterialTheme(
        colorScheme = colors,
        contentColor = content,
        content = content
    )
}

@Composable
fun SmartSokoDriverTypography() = androidx.compose.material3.Typography

@Composable
fun SmartSokoDriverShapes() = androidx.compose.material3.Shapes