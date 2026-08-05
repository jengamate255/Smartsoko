package com.smartsoko.customer.domain.repository

import com.smartsoko.customer.domain.model.PaymentMethod
import kotlinx.coroutines.flow.Flow

interface PaymentRepository {
    fun getPaymentMethods(): Flow<List<PaymentMethod>>
    suspend fun addPaymentMethod(paymentMethod: PaymentMethod): Result<PaymentMethod>
    suspend fun deletePaymentMethod(paymentMethodId: String): Result<Unit>
    suspend fun setDefaultPaymentMethod(paymentMethodId: String): Result<Unit>
    suspend fun getLastUsedPaymentMethod(): Result<PaymentMethod?>
    suspend fun saveLastUsedPaymentMethod(paymentMethod: PaymentMethod): Result<Unit>
}
