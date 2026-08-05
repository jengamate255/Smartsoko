package com.smartsoko.customer.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.smartsoko.customer.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(product: ProductEntity)

    @Update
    suspend fun update(product: ProductEntity)

    @Query("SELECT * FROM products WHERE id = :id")
    fun getProductById(id: String): Flow<ProductEntity?>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductByIdOnce(id: String): ProductEntity?

    @Query("SELECT * FROM products WHERE categoryId = :categoryId AND isAvailable = 1 ORDER BY rating DESC, reviewCount DESC")
    fun getProductsByCategory(categoryId: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE sellerId = :sellerId ORDER BY createdAt DESC")
    fun getProductsBySeller(sellerId: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE name LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%' ORDER BY rating DESC")
    fun searchProducts(query: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE isAvailable = 1 ORDER BY createdAt DESC LIMIT :limit OFFSET :offset")
    fun getProductsPaged(limit: Int, offset: Int): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE isAvailable = 1 ORDER BY rating DESC, reviewCount DESC LIMIT :limit")
    fun getTopRatedProducts(limit: Int): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE isAvailable = 1 ORDER BY createdAt DESC LIMIT :limit")
    fun getNewestProducts(limit: Int): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE isAvailable = 1 AND stockQuantity > 0 AND stockQuantity <= 5")
    fun getLowStockProducts(): Flow<List<ProductEntity>>

    @Query("DELETE FROM products WHERE cachedAt < :threshold")
    suspend fun deleteOldCache(threshold: Long)

    @Query("SELECT COUNT(*) FROM products WHERE isAvailable = 1")
    suspend fun getAvailableProductsCount(): Int

    @Transaction
    @Query("SELECT * FROM products WHERE id IN (:ids)")
    fun getProductsByIds(ids: List<String>): Flow<List<ProductEntity>>
}