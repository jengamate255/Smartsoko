package com.smartsoko.driver.domain.model

data class Earnings(
    val todayAmount: Double,
    val todayDeliveries: Int,
    val weeklyAmount: Double,
    val weeklyDeliveries: Int,
    val weeklyHistory: List<DailyEarning>
)

data class DailyEarning(
    val date: String,
    val amount: Double,
    val deliveries: Int
)
