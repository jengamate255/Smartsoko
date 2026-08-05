package com.smartsoko.admin.domain.model

data class User(
    val id: String,
    val name: String,
    val email: String,
    val phone: String = "",
    val role: String = "customer",
    val status: String = "active",
    val createdAt: String = "",
    val updatedAt: String = ""
)

data class Order(
    val id: String,
    val customerName: String = "",
    val status: String = "pending",
    val totalAmount: Double = 0.0,
    val createdAt: String = "",
    val itemCount: Int = 0
)

data class Product(
    val id: String,
    val name: String,
    val description: String = "",
    val price: Double = 0.0,
    val category: String = "",
    val stock: Int = 0,
    val unit: String = "",
    val imageUrl: String = "",
    val isAvailable: Boolean = true
)

data class Ticket(
    val id: String,
    val subject: String = "",
    val description: String = "",
    val customerName: String = "",
    val status: String = "open",
    val priority: String = "medium",
    val assignedTo: String = "",
    val createdAt: String = ""
)

data class DashboardData(
    val totalUsers: Int = 0,
    val activeUsers: Int = 0,
    val totalOrders: Int = 0,
    val pendingOrders: Int = 0,
    val totalRevenue: Double = 0.0,
    val revenueToday: Double = 0.0,
    val ordersToday: Int = 0,
    val lowStockItems: Int = 0,
    val totalProducts: Int = 0,
    val newUsersThisWeek: Int = 0
)
