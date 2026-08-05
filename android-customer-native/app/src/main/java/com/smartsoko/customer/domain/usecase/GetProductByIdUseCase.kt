package com.smartsoko.customer.domain.usecase

import com.smartsoko.customer.domain.model.Product
import com.smartsoko.customer.domain.repository.ProductRepository
import javax.inject.Inject

class GetProductByIdUseCase @Inject constructor(
    private val productRepository: ProductRepository
) {
    suspend operator fun invoke(productId: String): Result<Product> {
        return productRepository.getProductById(productId)
    }
}
