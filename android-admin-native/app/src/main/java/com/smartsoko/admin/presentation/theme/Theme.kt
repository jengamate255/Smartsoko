package com.smartsoko.admin.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = AdminPrimary,
    secondary = AdminAccent,
    tertiary = AdminPrimaryLight,
    background = AdminBackground,
    surface = AdminSurface,
    error = AdminError,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    onSecondary = androidx.compose.ui.graphics.Color.White,
    onBackground = AdminTextPrimary,
    onSurface = AdminTextPrimary,
    onError = androidx.compose.ui.graphics.Color.White,
    outline = AdminBorder,
)

private val DarkColorScheme = darkColorScheme(
    primary = AdminPrimaryLight,
    secondary = AdminAccent,
    tertiary = AdminPrimary,
    background = AdminDarkBackground,
    surface = AdminDarkSurface,
    surfaceVariant = AdminDarkSurfaceVariant,
    error = AdminError,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    onSecondary = androidx.compose.ui.graphics.Color.White,
    onBackground = AdminDarkTextPrimary,
    onSurface = AdminDarkTextPrimary,
    onError = androidx.compose.ui.graphics.Color.White,
    outline = AdminDarkBorder,
)

@Composable
fun SmartsokoAdminTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        typography = AdminTypography,
        content = content
    )
}
