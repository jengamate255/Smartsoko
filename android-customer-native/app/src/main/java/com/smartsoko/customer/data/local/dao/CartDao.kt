package com.smartsoko.customer.data.local.dao

import androidx.room.*
import com.smartsoko.customer.data.local.entity.CartEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CartDao {
    
    @Query("SELECT * FROM cart WHERE userId = :userId LIMIT 1")
    suspend fun getCartByUserId(userId: String): CartEntity?
    
    @Query("SELECT * FROM cart WHERE userId = :userId LIMIT 1")
    fun getCartByUserIdFlow(userId: String): Flow<CartEntity?>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCart(cart: CartEntity)
    
    @Update
    suspend fun updateCart(cart: CartEntity)
    
    @Query("UPDATE cart SET items = :items, updatedAt = :updatedAt WHERE userId = :userId")
    suspend fun updateCartItems(userId: String, items: String, updatedAt: Long)
    
    @Query("DELETE FROM cart WHERE userId = :userId")
    suspend fun deleteCartByUserId(userId: String)
    
    @Query("DELETE FROM cart")
    suspend fun deleteAllCarts()
}
