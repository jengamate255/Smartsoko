package com.smartsoko.driver.data.repository

import com.google.gson.Gson
import com.smartsoko.driver.data.local.AppDatabase
import com.smartsoko.driver.data.local.entity.OrderEntity
import com.smartsoko.driver.data.remote.ApiService
import com.smartsoko.driver.data.remote.WebSocketManager
import com.smartsoko.driver.data.remote.dto.*
import com.smartsoko.driver.domain.model.*
import com.smartsoko.driver.util.Resource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepository @Inject constructor(
    private val db: AppDatabase,
    private val api: ApiService,
    private val ws: WebSocketManager,
    private val gson: Gson
) {
    private val orderDao = db.orderDao()
    private val prefsDao = db.driverPrefsDao()

    fun getActiveOrderFlow(): Flow<Order?> {
        return prefsDao.getPrefsFlow().map { prefs ->
            val orderId = prefs?.activeOrderId ?: return@map null
            val entity = orderDao.getOrderById(orderId) ?: return@map null
            entity.toDomain()
        }
    }

    fun getAllOrdersFlow(): Flow<List<Order>> {
        return orderDao.getAllOrdersFlow().map { list -> list.mapNotNull { it.toDomain() } }
    }

    fun getOrdersByStatusFlow(status: OrderStatus): Flow<List<Order>> {
        return orderDao.getOrdersByStatus(status.name).map { list -> list.mapNotNull { it.toDomain() } }
    }

    suspend fun acceptOrder(token: String, orderId: String): Resource<Order> = withContext(Dispatchers.IO) {
        try {
            val resp = api.acceptOrder("Bearer $token", AcceptRejectDto(orderId, "accept"))
            val body = resp.body()
            if (resp.isSuccessful && body?.success == true && body.data != null) {
                val dto = body.data
                val order = dto.toDomain()
                orderDao.insertOrder(dto.toEntity())
                prefsDao.setActiveOrder(orderId)
                ws.sendOrderAccepted(orderId)
                Resource.Success(order)
            } else throw Exception(body?.message ?: "Accept failed")
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error", e)
        }
    }

    suspend fun rejectOrder(token: String, orderId: String): Resource<Unit> = withContext(Dispatchers.IO) {
        try {
            val resp = api.rejectOrder("Bearer $token", AcceptRejectDto(orderId, "reject"))
            val body = resp.body()
            if (resp.isSuccessful && body?.success == true) Resource.Success(Unit)
            else throw Exception(body?.message ?: "Reject failed")
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error", e)
        }
    }

    suspend fun updateStatus(token: String, orderId: String, status: OrderStatus): Resource<Order> = withContext(Dispatchers.IO) {
        try {
            val now = System.currentTimeMillis()
            val resp = api.updateOrderStatus("Bearer $token", OrderStatusUpdateDto(status.name, orderId, now))
            val body = resp.body()
            if (resp.isSuccessful && body?.success == true && body.data != null) {
                val dto = body.data
                val order = dto.toDomain()
                orderDao.insertOrder(dto.toEntity())
                orderDao.updateOrderStatus(orderId, status.name, now)
                ws.sendOrderStatus(orderId, status.name)
                if (status == OrderStatus.DELIVERED) prefsDao.setActiveOrder(null)
                Resource.Success(order)
            } else throw Exception(body?.message ?: "Status update failed")
        } catch (e: Exception) {
            // Fallback: update locally
            orderDao.updateOrderStatus(orderId, status.name, System.currentTimeMillis())
            ws.sendOrderStatus(orderId, status.name)
            Resource.Error(e.message ?: "Sync error, updated locally", e)
        }
    }

    suspend fun getHistory(token: String, page: Int = 1): Resource<List<Order>> = withContext(Dispatchers.IO) {
        try {
            val resp = api.getOrderHistory("Bearer $token", page)
            val body = resp.body()
            if (resp.isSuccessful && body?.success == true && body.data != null) {
                val orders = body.data.map { it.toDomain() }
                Resource.Success(orders)
            } else throw Exception(body?.message ?: "Failed to load history")
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to load history")
        }
    }

    suspend fun getEarnings(token: String): Resource<Earnings> = withContext(Dispatchers.IO) {
        try {
            val resp = api.getEarnings("Bearer $token")
            val body = resp.body()
            if (resp.isSuccessful && body?.success == true && body.data != null) {
                val d = body.data
                Resource.Success(Earnings(
                    todayAmount = d.today_amount,
                    todayDeliveries = d.today_deliveries,
                    weeklyAmount = d.weekly_amount,
                    weeklyDeliveries = d.weekly_deliveries,
                    weeklyHistory = d.daily_breakdown.map {
                        DailyEarning(date = it.date, amount = it.amount, deliveries = it.deliveries)
                    }
                ))
            } else throw Exception(body?.message ?: "Failed to load earnings")
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error", e)
        }
    }

    suspend fun syncPendingLocations() {
        val pending = db.locationQueueDao().getPendingLocations()
        if (pending.isEmpty()) return
        pending.forEach { loc ->
            ws.sendLocationUpdate(Location(loc.lat, loc.lng, loc.bearing, loc.speed, 0f, loc.timestamp))
        }
        db.locationQueueDao().markSent(pending.map { it.id })
        db.locationQueueDao().clearSent()
    }
}

private fun OrderDto.toDomain() = Order(
    id = id, pickupName = pickupName, pickupAddress = pickupAddress,
    pickupLat = pickupLat, pickupLng = pickupLng,
    dropoffName = dropoffName, dropoffAddress = dropoffAddress,
    dropoffLat = dropoffLat, dropoffLng = dropoffLng,
    customerName = customerName, customerPhone = customerPhone,
    items = items.map { OrderItem(it.name, it.quantity, it.price, it.notes) },
    totalAmount = totalAmount, deliveryFee = deliveryFee,
    status = try { OrderStatus.valueOf(status) } catch (_: Exception) { OrderStatus.PENDING },
    estimatedDistance = estimatedDistance, estimatedDuration = estimatedDuration,
    createdAt = createdAt, updatedAt = updatedAt,
    deliveryInstructions = deliveryInstructions
)

private fun OrderDto.toEntity() = OrderEntity(
    id = id, pickupName = pickupName, pickupAddress = pickupAddress,
    pickupLat = pickupLat, pickupLng = pickupLng,
    dropoffName = dropoffName, dropoffAddress = dropoffAddress,
    dropoffLat = dropoffLat, dropoffLng = dropoffLng,
    customerName = customerName, customerPhone = customerPhone,
    itemsJson = items.toString(), totalAmount = totalAmount,
    deliveryFee = deliveryFee, status = status,
    estimatedDistance = estimatedDistance, estimatedDuration = estimatedDuration,
    createdAt = createdAt, updatedAt = updatedAt,
    deliveryInstructions = deliveryInstructions, isSynced = true
)

private fun OrderEntity.toDomain() = Order(
    id = id, pickupName = pickupName, pickupAddress = pickupAddress,
    pickupLat = pickupLat, pickupLng = pickupLng,
    dropoffName = dropoffName, dropoffAddress = dropoffAddress,
    dropoffLat = dropoffLat, dropoffLng = dropoffLng,
    customerName = customerName, customerPhone = customerPhone,
    items = emptyList(), totalAmount = totalAmount, deliveryFee = deliveryFee,
    status = try { OrderStatus.valueOf(status) } catch (_: Exception) { OrderStatus.PENDING },
    estimatedDistance = estimatedDistance, estimatedDuration = estimatedDuration,
    createdAt = createdAt, updatedAt = updatedAt,
    deliveryInstructions = deliveryInstructions
)
