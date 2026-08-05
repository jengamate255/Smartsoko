package com.smartsoko.customer.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.map
import com.google.gson.Gson
import com.smartsoko.customer.data.local.dao.OrderDao
import com.smartsoko.customer.data.local.entity.OrderEntity
import com.smartsoko.customer.data.remote.api.CreateOrderRequestDto
import com.smartsoko.customer.data.remote.api.SmartsokoApiService
import com.smartsoko.customer.data.remote.dto.OrderDto
import com.smartsoko.customer.data.repository.AuthRepositoryImpl
import com.smartsoko.customer.domain.model.*
import com.smartsoko.customer.domain.repository.AuthRepository
import com.smartsoko.customer.domain.repository.OrderRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class OrderRepositoryImpl @Inject constructor(
    private val orderDao: OrderDao,
    private val apiService: SmartsokoApiService,
    private val gson: Gson,
    private val authRepository: AuthRepository
) : OrderRepository {
    
    private val currentUserId: String
        get() = authRepository.getCurrentUserId() ?: ""

    override fun getOrders(): Flow<PagingData<Order>> {
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = false,
                prefetchDistance = 5
            ),
            pagingSourceFactory = { orderDao.getOrdersByUserId(currentUserId) }
        ).flow.map { pagingData ->
            pagingData.map { it.toDomainModel() }
        }
    }
    
    override fun getOrdersByStatus(status: OrderStatus): Flow<List<Order>> {
        return orderDao.getOrdersByStatus(currentUserId, status.name).map { entities ->
            entities.map { it.toDomainModel() }
        }
    }
    
    override suspend fun getOrderById(orderId: String): Result<Order> {
        return try {
            val localOrder = orderDao.getOrderById(orderId)
            if (localOrder != null) {
                Result.success(localOrder.toDomainModel())
            } else {
                val response = apiService.getOrderById(orderId)
                if (response.isSuccessful && response.body()?.success == true) {
                    val orderDto = response.body()?.data
                    if (orderDto != null) {
                        val entity = orderDto.toEntity()
                        orderDao.insertOrder(entity)
                        Result.success(entity.toDomainModel())
                    } else {
                        Result.failure(Exception("Order not found"))
                    }
                } else {
                    Result.failure(Exception(response.message()))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun createOrder(
        addressId: String,
        paymentMethodId: String?,
        notes: String?
    ): Result<Order> {
        return try {
            val request = CreateOrderRequestDto(
                addressId = addressId,
                paymentMethodId = paymentMethodId,
                notes = notes
            )
            val response = apiService.createOrder(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val orderDto = response.body()?.data
                if (orderDto != null) {
                    val entity = orderDto.toEntity()
                    orderDao.insertOrder(entity)
                    Result.success(entity.toDomainModel())
                } else {
                    Result.failure(Exception("Failed to create order"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun cancelOrder(orderId: String): Result<Unit> {
        return try {
            val response = apiService.cancelOrder(orderId)
            if (response.isSuccessful) {
                orderDao.updateOrderStatus(orderId, OrderStatus.CANCELLED.name)
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun refreshOrders(): Result<Unit> {
        return try {
            val response = apiService.getOrders()
            if (response.isSuccessful && response.body()?.success == true) {
                val orders = response.body()?.data?.data ?: emptyList()
                val entities = orders.map { it.toEntity() }
                orderDao.deleteOrdersByUserId(currentUserId)
                orderDao.insertOrders(entities)
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun OrderDto.toEntity(): OrderEntity {
        return OrderEntity(
            id = id,
            userId = userId,
            items = gson.toJson(items),
            status = status,
            deliveryAddress = gson.toJson(deliveryAddress),
            paymentMethod = gson.toJson(paymentMethod),
            subtotal = subtotal,
            deliveryFee = deliveryFee,
            total = total,
            currency = currency,
            createdAt = createdAt,
            updatedAt = updatedAt,
            estimatedDeliveryTime = estimatedDeliveryTime,
            driver = gson.toJson(driver)
        )
    }
    
    private fun OrderEntity.toDomainModel(): Order {
        val itemsType = object : com.google.gson.reflect.TypeToken<List<com.smartsoko.customer.data.remote.dto.OrderItemDto>>() {}.type
        val itemsList = gson.fromJson<List<com.smartsoko.customer.data.remote.dto.OrderItemDto>>(items, itemsType) ?: emptyList()
        
        val addressType = object : com.google.gson.reflect.TypeToken<com.smartsoko.customer.data.remote.dto.AddressDto>() {}.type
        val addressDto = gson.fromJson<com.smartsoko.customer.data.remote.dto.AddressDto>(deliveryAddress, addressType)
        
        val paymentType = object : com.google.gson.reflect.TypeToken<com.smartsoko.customer.data.remote.dto.PaymentMethodDto>() {}.type
        val paymentDto = gson.fromJson<com.smartsoko.customer.data.remote.dto.PaymentMethodDto>(paymentMethod, paymentType)
        
        val driverType = object : com.google.gson.reflect.TypeToken<com.smartsoko.customer.data.remote.dto.DriverDto>() {}.type
        val driverDto = gson.fromJson<com.smartsoko.customer.data.remote.dto.DriverDto>(driver, driverType)
        
        return Order(
            id = id,
            userId = userId,
            items = itemsList.map { it.toDomainModel() },
            status = OrderStatus.valueOf(status),
            deliveryAddress = addressDto?.toDomainModel() ?: Address("", "", "", "", "", "", null, "", null, Location(0.0, 0.0, null), false, null),
            paymentMethod = paymentDto?.toDomainModel() ?: PaymentMethod("", PaymentType.CASH_ON_DELIVERY, "Cash", false, null, null),
            subtotal = subtotal,
            deliveryFee = deliveryFee,
            total = total,
            currency = currency,
            createdAt = createdAt,
            updatedAt = updatedAt,
            estimatedDeliveryTime = estimatedDeliveryTime,
            driver = driverDto?.toDomainModel()
        )
    }
    
    private fun com.smartsoko.customer.data.remote.dto.OrderItemDto.toDomainModel(): OrderItem {
        return OrderItem(
            productId = productId,
            productName = productName,
            productImage = productImage,
            quantity = quantity,
            price = price,
            sellerId = sellerId,
            sellerName = sellerName
        )
    }
    
    private fun com.smartsoko.customer.data.remote.dto.AddressDto.toDomainModel(): Address {
        return Address(
            id = id,
            userId = userId,
            title = title,
            fullName = fullName,
            phoneNumber = phoneNumber,
            streetAddress = streetAddress,
            apartment = apartment,
            city = city,
            postalCode = postalCode,
            location = Location(location.latitude, location.longitude, location.address),
            isDefault = isDefault,
            deliveryInstructions = deliveryInstructions
        )
    }
    
    private fun com.smartsoko.customer.data.remote.dto.PaymentMethodDto.toDomainModel(): PaymentMethod {
        return PaymentMethod(
            id = id,
            type = PaymentType.valueOf(type),
            displayName = displayName,
            isDefault = isDefault,
            lastFourDigits = lastFourDigits,
            provider = provider
        )
    }
    
    private fun com.smartsoko.customer.data.remote.dto.DriverDto.toDomainModel(): Driver {
        return Driver(
            id = id,
            name = name,
            phoneNumber = phoneNumber,
            vehicleNumber = vehicleNumber,
            vehicleType = VehicleType.valueOf(vehicleType),
            rating = rating,
            imageUrl = imageUrl,
            currentLocation = currentLocation?.let { loc -> Location(loc.latitude, loc.longitude, loc.address) }
        )
    }
}
