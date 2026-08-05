package com.smartsoko.customer.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.map
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartsoko.customer.data.local.dao.ProductDao
import com.smartsoko.customer.data.local.entity.ProductEntity
import com.smartsoko.customer.data.remote.api.SmartsokoApiService
import com.smartsoko.customer.data.remote.dto.CategoryDto
import com.smartsoko.customer.data.remote.dto.ProductDto
import com.smartsoko.customer.domain.model.Category
import com.smartsoko.customer.domain.model.Product
import com.smartsoko.customer.domain.model.Seller
import com.smartsoko.customer.domain.repository.ProductRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class ProductRepositoryImpl @Inject constructor(
    private val productDao: ProductDao,
    private val apiService: SmartsokoApiService,
    private val gson: Gson
) : ProductRepository {
    
    override fun getProducts(categoryId: String?): Flow<PagingData<Product>> {
        return if (categoryId != null) {
            Pager(
                config = PagingConfig(
                    pageSize = 20,
                    enablePlaceholders = false,
                    prefetchDistance = 5
                ),
                pagingSourceFactory = { productDao.getProductsByCategory(categoryId) }
            ).flow.map { pagingData ->
                pagingData.map { it.toDomainModel() }
            }
        } else {
            Pager(
                config = PagingConfig(
                    pageSize = 20,
                    enablePlaceholders = false,
                    prefetchDistance = 5
                ),
                pagingSourceFactory = { productDao.getAllProducts() }
            ).flow.map { pagingData ->
                pagingData.map { it.toDomainModel() }
            }
        }
    }
    
    override fun getFeaturedProducts(): Flow<PagingData<Product>> {
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = false,
                prefetchDistance = 5
            ),
            pagingSourceFactory = { productDao.getFeaturedProducts() }
        ).flow.map { pagingData ->
            pagingData.map { it.toDomainModel() }
        }
    }
    
    override fun searchProducts(query: String): Flow<PagingData<Product>> {
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = false,
                prefetchDistance = 5
            ),
            pagingSourceFactory = { productDao.searchProducts(query) }
        ).flow.map { pagingData ->
            pagingData.map { it.toDomainModel() }
        }
    }
    
    override suspend fun getProductById(productId: String): Result<Product> {
        return try {
            val response = apiService.getProductById(productId)
            if (response.isSuccessful && response.body()?.success == true) {
                val productDto = response.body()?.data
                if (productDto != null) {
                    val entity = productDto.toEntity()
                    productDao.insertProduct(entity)
                    return Result.success(entity.toDomainModel())
                }
            }
            val localProduct = productDao.getProductById(productId)
            if (localProduct != null) {
                Result.success(localProduct.toDomainModel())
            } else {
                Result.failure(Exception(response.message().ifBlank { "Product not found" }))
            }
        } catch (e: Exception) {
            try {
                val localProduct = productDao.getProductById(productId)
                if (localProduct != null) Result.success(localProduct.toDomainModel())
                else Result.failure(e)
            } catch (localError: Exception) {
                Result.failure(e)
            }
        }
    }
    
    override suspend fun getCategories(): Result<List<Category>> {
        return try {
            val response = apiService.getCategories()
            if (response.isSuccessful && response.body()?.success == true) {
                val categories = response.body()?.data?.map { it.toDomainModel() } ?: emptyList()
                Result.success(categories)
            } else {
                Result.failure(Exception("Failed to load categories"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun refreshProducts(): Result<Unit> {
        return try {
            val response = apiService.getProducts(page = 1, perPage = 100)
            if (response.isSuccessful && response.body()?.success == true) {
                val products = response.body()?.data?.data ?: emptyList()
                val entities = products.map { it.toEntity() }
                productDao.deleteAllProducts()
                productDao.insertProducts(entities)
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun refreshFeaturedProducts(): Result<Unit> {
        return try {
            val response = apiService.getFeaturedProducts()
            if (response.isSuccessful && response.body()?.success == true) {
                val products = response.body()?.data ?: emptyList()
                val entities = products.map { it.toEntity() }
                productDao.insertProducts(entities)
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun ProductDto.toEntity(): ProductEntity {
        return ProductEntity(
            id = id,
            name = name,
            description = description,
            price = price,
            currency = currency,
            images = gson.toJson(images),
            categoryId = category.id,
            categoryName = category.name,
            categoryImageUrl = category.imageUrl,
            sellerId = seller.id,
            sellerName = seller.name,
            sellerRating = seller.rating,
            sellerDeliveryTime = seller.deliveryTime,
            sellerImageUrl = seller.imageUrl,
            stock = stock,
            rating = rating,
            reviewCount = reviewCount,
            isFeatured = isFeatured,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
    
    private fun CategoryDto.toDomainModel(): Category {
        return Category(
            id = id,
            name = name,
            imageUrl = imageUrl,
            description = description
        )
    }

    private fun ProductEntity.toDomainModel(): Product {
        val imagesType = object : TypeToken<List<String>>() {}.type
        val imagesList = gson.fromJson<List<String>>(images, imagesType) ?: emptyList()
        
        return Product(
            id = id,
            name = name,
            description = description,
            price = price,
            currency = currency,
            images = imagesList,
            category = Category(
                id = categoryId,
                name = categoryName,
                imageUrl = categoryImageUrl
            ),
            seller = Seller(
                id = sellerId,
                name = sellerName,
                rating = sellerRating,
                deliveryTime = sellerDeliveryTime,
                imageUrl = sellerImageUrl
            ),
            stock = stock,
            rating = rating,
            reviewCount = reviewCount,
            isFeatured = isFeatured,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
}
