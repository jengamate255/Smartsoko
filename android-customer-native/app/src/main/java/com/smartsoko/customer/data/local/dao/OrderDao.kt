package com.smartsoko.customer.data.local.dao

import androidx.paging.PagingSource
import androidx.room.*
import com.smartsoko.customer.data.local.entity.OrderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    
    @Query("SELECT * FROM orders WHERE id = :orderId")
    suspend fun getOrderById(orderId: String): OrderEntity?
    
    @Query("SELECT * FROM orders WHERE id = :orderId")
    fun getOrderByIdFlow(orderId: String): Flow<OrderEntity?>
    
    @Query("SELECT * FROM orders WHERE userId = :userId ORDER BY createdAt DESC")
    fun getOrdersByUserId(userId: String): PagingSource<Int, OrderEntity>
    
    @Query("SELECT * FROM orders WHERE userId = :userId ORDER BY createdAt DESC")
    fun getOrdersByUserIdFlow(userId: String): Flow<List<OrderEntity>>
    
    @Query("SELECT * FROM orders WHERE userId = :userId AND status = :status ORDER BY createdAt DESC")
    fun getOrdersByStatus(userId: String, status: String): Flow<List<OrderEntity>>
    
    @Query("SELECT * FROM orders WHERE userId = :userId ORDER BY createdAt DESC LIMIT 1")
    suspend fun getLatestOrder(userId: String): OrderEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrders(orders: List<OrderEntity>)
    
    @Update
    suspend fun updateOrder(order: OrderEntity)
    
    @Query("UPDATE orders SET status = :status WHERE id = :orderId")
    suspend fun updateOrderStatus(orderId: String, status: String)
    
    @Delete
    suspend fun deleteOrder(order: OrderEntity)
    
    @Query("DELETE FROM orders WHERE userId = :userId")
    suspend fun deleteOrdersByUserId(userId: String)
}
