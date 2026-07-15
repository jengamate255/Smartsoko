package com.smartsoko.customer.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.smartsoko.customer.data.local.entity.CartItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CartDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: CartItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<CartItemEntity>)

    @Update
    suspend fun update(item: CartItemEntity)

    @Delete
    suspend fun delete(item: CartItemEntity)

    @Query("DELETE FROM cart_items WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("SELECT * FROM cart_items ORDER BY addedAt DESC")
    fun getAllCartItems(): Flow<List<CartItemEntity>>

    @Query("SELECT * FROM cart_items WHERE sellerId = :sellerId")
    fun getCartItemsBySeller(sellerId: String): Flow<List<CartItemEntity>>

    @Query("SELECT COUNT(*) FROM cart_items")
    suspend fun getCartItemCount(): Int

    @Query("SELECT SUM(price * quantity) FROM cart_items")
    suspend fun getCartSubtotal(): Double

    @Query("DELETE FROM cart_items")
    suspend fun clearCart()

    @Query("SELECT * FROM cart_items WHERE productId = :productId AND sellerId = :sellerId")
    suspend fun getCartItem(productId: String, sellerId: String): CartItemEntity?

    @Transaction
    @Query("SELECT * FROM cart_items WHERE id IN (:ids)")
    fun getCartItemsByIds(ids: List<String>): Flow<List<CartItemEntity>>
}