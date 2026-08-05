package com.smartsoko.admin.presentation.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val AdminTypography = Typography(
    headlineLarge = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.W800, color = AdminTextPrimary),
    headlineMedium = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.W700, color = AdminTextPrimary),
    titleLarge = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.W600, color = AdminTextPrimary),
    titleMedium = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.W500, color = AdminTextPrimary),
    bodyLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal, color = AdminTextPrimary),
    bodyMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Normal, color = AdminTextSecondary),
    labelLarge = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.W600, color = AdminTextPrimary),
    labelMedium = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.W500, color = AdminTextSecondary),
)
