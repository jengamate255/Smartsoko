package com.smartsoko.admin.data.remote.dto

import com.google.gson.annotations.SerializedName

// Generic API response wrappers
data class ApiResponse<T>(
    val success: Boolean = false,
    val data: T? = null,
    val message: String? = null,
    val error: String? = null,
    val count: Int? = null,
    val total: Int? = null
)

data class ApiListResponse<T>(
    val success: Boolean = false,
    val data: List<T> = emptyList(),
    val count: Int = 0,
    val page: Int = 1,
    val limit: Int = 100
)

// Auth
data class LoginRequest(val email: String, val password: String)
data class LoginResponse(val token: String, val user: UserDto?, val role: String?)

// Dashboard stats
data class DashboardStats(
    val ordersToday: Int? = null,
    val revenueToday: Double? = null,
    val activeUsers: Int? = null,
    val pendingOrders: Int? = null,
    val totalRevenue: Double? = null,
    val totalOrders: Int? = null,
    val lowStockItems: Int? = null,
    val totalProducts: Int? = null,
    val growth: GrowthData? = null,
    val byRole: RoleStats? = null
)

data class GrowthData(val thisWeek: Int? = null, val thisMonth: Int? = null)
data class RoleStats(val customer: Int? = null, val seller: Int? = null, val driver: Int? = null, val admin: Int? = null)

// User
data class UserDto(
    val id: String? = null,
    val name: String? = null,
    val fullName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val role: String? = null,
    val status: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val imageUrl: String? = null,
    val suspendedBy: String? = null,
    val suspendedAt: String? = null,
    val deletedBy: String? = null,
    val deletedAt: String? = null,
    val referralCode: String? = null,
    val referralCount: Int? = null
)

// Order
data class OrderDto(
    val id: String? = null,
    val customerId: String? = null,
    val customerName: String? = null,
    val customerEmail: String? = null,
    val merchantId: String? = null,
    val merchantName: String? = null,
    val status: String? = null,
    val totalAmount: Double? = null,
    val deliveryFee: Double? = null,
    val commission: Double? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val items: List<OrderItemDto>? = null,
    val deliveryAddress: String? = null,
    val driverId: String? = null,
    val internalNotes: List<NoteDto>? = null,
    val refunds: List<RefundDto>? = null
)

data class OrderItemDto(
    val productId: String? = null,
    val name: String? = null,
    val quantity: Int? = null,
    val price: Double? = null
)

data class NoteDto(val note: String? = null, val addedBy: String? = null, val timestamp: String? = null)
data class RefundDto(val amount: Double? = null, val reason: String? = null, val processedBy: String? = null, val processedAt: String? = null)

data class OrderEventDto(
    val id: String? = null,
    val type: String? = null,
    val detail: String? = null,
    val actor: String? = null,
    val timestamp: String? = null
)

// Product
data class ProductDto(
    val id: String? = null,
    val name: String? = null,
    val description: String? = null,
    val price: Double? = null,
    val category: String? = null,
    val stock: Int? = null,
    val unit: String? = null,
    val imageUrl: String? = null,
    val isAvailable: Boolean? = null,
    val merchantId: String? = null,
    val createdAt: String? = null
)

// Support Ticket
data class TicketDto(
    val id: String? = null,
    val subject: String? = null,
    val description: String? = null,
    val customerName: String? = null,
    val customerEmail: String? = null,
    val status: String? = null,
    val priority: String? = null,
    val assignedTo: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val responses: List<TicketResponseDto>? = null,
    val internalNotes: List<NoteDto>? = null
)

data class TicketResponseDto(
    val body: String? = null,
    val respondedBy: String? = null,
    val timestamp: String? = null
)

data class SlaMetrics(
    val total: Int? = null,
    val open: Int? = null,
    val inProgress: Int? = null,
    val resolved: Int? = null,
    val breached: Int? = null,
    val avgResolutionHours: Double? = null
)

// Commission
data class CommissionRuleDto(
    val id: String? = null,
    val name: String? = null,
    val category: String? = null,
    val rate: Double? = null,
    val type: String? = null,
    val isActive: Boolean? = null
)

// Payout
data class PayoutDto(
    val id: String? = null,
    val sellerId: String? = null,
    val amount: Double? = null,
    val status: String? = null,
    val notes: String? = null,
    val createdAt: String? = null,
    val transactionRef: String? = null
)

// Analytics
data class RevenueReport(
    val totalRevenue: Double? = null,
    val totalCommission: Double? = null,
    val totalOrders: Int? = null,
    val avgOrderValue: Double? = null,
    val daily: List<DailyRevenue>? = null
)

data class DailyRevenue(
    val date: String? = null,
    val revenue: Double? = null,
    val orders: Int? = null,
    val commission: Double? = null
)

data class TopSellerDto(
    val id: String? = null,
    val name: String? = null,
    val revenue: Double? = null,
    val orders: Int? = null
)
