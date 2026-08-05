package com.smartsoko.driver.util

object Validators {
    fun isValidEmail(email: String): Boolean {
        if (email.isBlank()) return false
        val emailRegex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
        return emailRegex.matches(email.trim())
    }

    fun isValidPhone(phone: String): Boolean {
        if (phone.isBlank()) return false
        val digits = phone.filter { it.isDigit() }
        return digits.length in 9..15
    }

    fun isValidPassword(password: String): String? {
        return when {
            password.length < 6 -> "Password must be at least 6 characters"
            !password.any { it.isDigit() } -> "Password must contain at least one digit"
            !password.any { it.isLetter() } -> "Password must contain at least one letter"
            else -> null
        }
    }

    fun emailError(email: String): String? {
        return when {
            email.isBlank() -> "Email is required"
            !isValidEmail(email) -> "Invalid email format"
            else -> null
        }
    }

    fun phoneError(phone: String): String? {
        return when {
            phone.isBlank() -> "Phone is required"
            !isValidPhone(phone) -> "Invalid phone number (9-15 digits required)"
            else -> null
        }
    }

    fun requiredError(value: String, fieldName: String): String? {
        return if (value.isBlank()) "$fieldName is required" else null
    }
}
