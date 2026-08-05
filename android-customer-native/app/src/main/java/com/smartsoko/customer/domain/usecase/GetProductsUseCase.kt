package com.smartsoko.customer.domain.usecase

import androidx.paging.PagingData
import com.smartsoko.customer.domain.model.Product
import com.smartsoko.customer.domain.repository.ProductRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetProductsUseCase @Inject constructor(
    private val productRepository: ProductRepository
) {
    operator fun invoke(categoryId: String? = null): Flow<PagingData<Product>> {
        return productRepository.getProducts(categoryId)
    }
}
