package com.smartsoko.customer.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.smartsoko.customer.data.local.entity.OrderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(order: OrderEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(orders: List<OrderEntity>)

    @Update
    suspend fun update(order: OrderEntity)

    @Query("SELECT * FROM orders WHERE id = :id")
    fun getOrderById(id: String): Flow<OrderEntity?>

    @Query("SELECT * FROM orders WHERE id = :id")
    suspend fun getOrderByIdOnce(id: String): OrderEntity?

    @Query("SELECT * FROM orders WHERE userId = :userId ORDER BY createdAt DESC")
    fun getOrdersByUser(userId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE userId = :userId ORDER BY createdAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getOrdersByUserPaged(userId: String, limit: Int, offset: Int): List<OrderEntity>

    @Query("SELECT * FROM orders WHERE userId = :userId AND status IN ('PENDING', 'ACCEPTED', 'ON_THE_WAY') ORDER BY createdAt DESC")
    fun getActiveOrders(userId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE userId = :userId AND status IN ('DELIVERED', 'CANCELLED') ORDER BY createdAt DESC")
    fun getCompletedOrders(userId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE status = :status ORDER BY createdAt DESC")
    fun getOrdersByStatus(status: String): Flow<List<OrderEntity>>

    @Query("SELECT COUNT(*) FROM orders WHERE userId = :userId")
    suspend fun getOrderCount(userId: String): Int

    @Query("SELECT COUNT(*) FROM orders WHERE userId = :userId AND status = :status")
    suspend fun getOrderCountByStatus(userId: String, status: String): Int

    @Query("DELETE FROM orders WHERE id = :id")
    suspend fun deleteOrder(id: String)

    @Query("DELETE FROM orders WHERE createdAt < :threshold")
    suspend fun deleteOldOrders(threshold: Long)

    @Transaction
    @Query("SELECT * FROM orders WHERE id IN (:ids)")
    fun getOrdersByIds(ids: List<String>): Flow<List<OrderEntity>>
}