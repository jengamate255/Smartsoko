package com.smartsoko.customer.domain.repository

import androidx.paging.PagingData
import com.smartsoko.customer.domain.model.Category
import com.smartsoko.customer.domain.model.Product
import kotlinx.coroutines.flow.Flow

interface ProductRepository {
    fun getProducts(categoryId: String? = null): Flow<PagingData<Product>>
    fun getFeaturedProducts(): Flow<PagingData<Product>>
    fun searchProducts(query: String): Flow<PagingData<Product>>
    suspend fun getProductById(productId: String): Result<Product>
    suspend fun getCategories(): Result<List<Category>>
    suspend fun refreshProducts(): Result<Unit>
    suspend fun refreshFeaturedProducts(): Result<Unit>
}
