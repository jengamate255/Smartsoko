package com.smartsoko.admin.data.remote.dto

import com.google.gson.annotations.SerializedName

data class LoginResponse(
    @SerializedName("token") val token: String,
    @SerializedName("user") val user: UserDto
)

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("role") val role: String?
)

data class NotificationDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("body") val body: String?,
    @SerializedName("audience") val audience: String,
    @SerializedName("priority") val priority: String,
    @SerializedName("channel") val channel: String,
    @SerializedName("status") val status: String,
    @SerializedName("created_at") val createdAt: String
)

data class RoleDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("permissions") val permissions: List<String>,
    @SerializedName("user_count") val userCount: Int
)

data class UserRoleAssignmentDto(
    @SerializedName("user_id") val userId: String,
    @SerializedName("user_name") val userName: String,
    @SerializedName("user_email") val userEmail: String,
    @SerializedName("role") val role: String,
    @SerializedName("status") val status: String
)

data class PayoutDto(
    @SerializedName("id") val id: String,
    @SerializedName("driver_name") val driverName: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("status") val status: String,
    @SerializedName("method") val method: String,
    @SerializedName("created_at") val createdAt: String
)

data class RefundDto(
    @SerializedName("id") val id: String,
    @SerializedName("order_id") val orderId: String,
    @SerializedName("customer_name") val customerName: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("reason") val reason: String,
    @SerializedName("status") val status: String
)

data class DisputeDto(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String,
    @SerializedName("party_name") val partyName: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("issue") val issue: String,
    @SerializedName("status") val status: String,
    @SerializedName("priority") val priority: String
)

data class WebhookDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("url") val url: String,
    @SerializedName("events") val events: String,
    @SerializedName("status") val status: String,
    @SerializedName("secret") val secret: String
)

data class ApiKeyDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("key") val key: String,
    @SerializedName("permissions") val permissions: String,
    @SerializedName("status") val status: String,
    @SerializedName("created_at") val createdAt: String
)

data class AuditLogDto(
    @SerializedName("id") val id: String,
    @SerializedName("user_name") val userName: String,
    @SerializedName("action") val action: String,
    @SerializedName("target") val target: String?,
    @SerializedName("details") val details: String?,
    @SerializedName("timestamp") val timestamp: String
)

data class SettingDto(
    @SerializedName("key") val key: String,
    @SerializedName("value") val value: String,
    @SerializedName("description") val description: String?
)
