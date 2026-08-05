package com.smartsoko.customer.domain.usecase

import androidx.paging.PagingData
import com.smartsoko.customer.domain.model.Product
import com.smartsoko.customer.domain.repository.ProductRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class SearchProductsUseCase @Inject constructor(
    private val productRepository: ProductRepository
) {
    operator fun invoke(query: String): Flow<PagingData<Product>> {
        return productRepository.searchProducts(query)
    }
}
