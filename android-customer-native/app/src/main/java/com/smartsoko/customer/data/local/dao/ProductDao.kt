package com.smartsoko.customer.data.local.dao

import androidx.paging.PagingSource
import androidx.room.*
import com.smartsoko.customer.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    
    @Query("SELECT * FROM products WHERE id = :productId")
    suspend fun getProductById(productId: String): ProductEntity?
    
    @Query("SELECT * FROM products WHERE id = :productId")
    fun getProductByIdFlow(productId: String): Flow<ProductEntity?>
    
    @Query("SELECT * FROM products WHERE categoryId = :categoryId ORDER BY createdAt DESC")
    fun getProductsByCategory(categoryId: String): PagingSource<Int, ProductEntity>
    
    @Query("SELECT * FROM products WHERE stock != 0 ORDER BY createdAt DESC LIMIT 20")
    fun getFeaturedProducts(): PagingSource<Int, ProductEntity>
    
    @Query("SELECT * FROM products WHERE name LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%' ORDER BY createdAt DESC")
    fun searchProducts(query: String): PagingSource<Int, ProductEntity>
    
    @Query("SELECT * FROM products ORDER BY createdAt DESC")
    fun getAllProducts(): PagingSource<Int, ProductEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<ProductEntity>)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity)
    
    @Delete
    suspend fun deleteProduct(product: ProductEntity)
    
    @Query("SELECT COUNT(*) FROM products")
    suspend fun count(): Int

    @Query("DELETE FROM products")
    suspend fun deleteAllProducts()
    
    @Query("SELECT * FROM products WHERE categoryId = :categoryId AND isFeatured = 1 LIMIT 10")
    suspend fun getFeaturedProductsByCategory(categoryId: String): List<ProductEntity>
}
