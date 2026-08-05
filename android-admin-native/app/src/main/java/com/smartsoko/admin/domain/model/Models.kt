package com.smartsoko.admin.domain.model

data class AdminUser(
    val id: String,
    val name: String,
    val email: String,
    val role: String
)

data class Notification(
    val id: String,
    val title: String,
    val body: String?,
    val audience: String,
    val priority: String,
    val channel: String,
    val status: String,
    val createdAt: String
)

data class Role(
    val id: String,
    val name: String,
    val permissions: List<String>,
    val userCount: Int
)

data class UserRole(
    val userId: String,
    val userName: String,
    val userEmail: String,
    val role: String,
    val status: String
)

data class Payout(
    val id: String,
    val driverName: String,
    val amount: Double,
    val status: String,
    val method: String,
    val createdAt: String
)

data class Refund(
    val id: String,
    val orderId: String,
    val customerName: String,
    val amount: Double,
    val reason: String,
    val status: String
)

data class Dispute(
    val id: String,
    val type: String,
    val partyName: String,
    val amount: Double,
    val issue: String,
    val status: String,
    val priority: String
)

data class Webhook(
    val id: String,
    val name: String,
    val url: String,
    val events: String,
    val status: String,
    val secret: String
)

data class ApiKey(
    val id: String,
    val name: String,
    val key: String,
    val permissions: String,
    val status: String,
    val createdAt: String
)

data class AuditLog(
    val id: String,
    val userName: String,
    val action: String,
    val target: String?,
    val details: String?,
    val timestamp: String
)
