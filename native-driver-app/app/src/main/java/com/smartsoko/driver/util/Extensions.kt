package com.smartsoko.driver.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun Double.formatDistance(): String {
    return if (this < 1.0) "${(this * 1000).toInt()} m" else String.format("%.1f km", this)
}

fun String.formatTimestamp(): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = sdf.parse(this.take(19)) ?: Date()
        val out = SimpleDateFormat("MMM dd, hh:mm a", Locale.getDefault())
        out.format(date)
    } catch (_: Exception) {
        this.take(10)
    }
}

fun Long.formatTimestamp(): String {
    val sdf = SimpleDateFormat("MMM dd, hh:mm a", Locale.getDefault())
    return sdf.format(Date(this))
}

fun Long.toCurrency(): String {
    return "TZS ${this}"
}
