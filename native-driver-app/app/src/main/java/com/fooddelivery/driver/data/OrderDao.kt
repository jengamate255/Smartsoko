package com.fooddelivery.driver.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fooddelivery.driver.data.model.OrderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertOrder(order: OrderEntity)

    @Query("SELECT * FROM orders ORDER BY createdAt DESC")
    fun getAllOrders(): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE isSynced = 0")
    fun getUnsyncedOrders(): Flow<List<OrderEntity>>

    @Query("UPDATE orders SET isSynced = 1 WHERE id = :orderId")
    fun markOrderAsSynced(orderId: String): Int
}
