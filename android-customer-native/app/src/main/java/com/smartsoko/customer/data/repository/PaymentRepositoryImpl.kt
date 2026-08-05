package com.smartsoko.customer.data.repository

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartsoko.customer.data.remote.api.AddPaymentMethodRequestDto
import com.smartsoko.customer.data.remote.api.SmartsokoApiService
import com.smartsoko.customer.data.remote.dto.PaymentMethodDto
import com.smartsoko.customer.domain.model.PaymentMethod
import com.smartsoko.customer.domain.model.PaymentType
import com.smartsoko.customer.domain.repository.PaymentRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class PaymentRepositoryImpl @Inject constructor(
    private val apiService: SmartsokoApiService,
    @ApplicationContext private val context: Context,
    private val gson: Gson
) : PaymentRepository {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val sharedPreferences: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            context,
            "encrypted_payment_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
    
    private companion object {
        private const val KEY_LAST_PAYMENT_METHOD = "last_payment_method"
        private const val KEY_PAYMENT_METHODS = "payment_methods_cache"
    }
    
    override fun getPaymentMethods(): Flow<List<PaymentMethod>> {
        return flow {
            val fresh = fetchPaymentMethodsFromApi()
            if (fresh != null) {
                cachePaymentMethods(fresh)
                emit(fresh)
            } else {
                emit(readCachedPaymentMethods())
            }
        }
    }
    
    private suspend fun fetchPaymentMethodsFromApi(): List<PaymentMethod>? {
        return try {
            val response = apiService.getPaymentMethods()
            if (response.isSuccessful && response.body()?.success == true) {
                response.body()?.data?.map { it.toDomainModel() }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
    
    private fun cachePaymentMethods(methods: List<PaymentMethod>) {
        sharedPreferences.edit()
            .putString(KEY_PAYMENT_METHODS, gson.toJson(methods))
            .apply()
    }
    
    private fun readCachedPaymentMethods(): List<PaymentMethod> {
        val json = sharedPreferences.getString(KEY_PAYMENT_METHODS, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<PaymentMethod>>() {}.type
            gson.fromJson<List<PaymentMethod>>(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
    
    override suspend fun addPaymentMethod(paymentMethod: PaymentMethod): Result<PaymentMethod> {
        return try {
            val request = AddPaymentMethodRequestDto(
                type = paymentMethod.type.name,
                displayName = paymentMethod.displayName,
                lastFourDigits = paymentMethod.lastFourDigits,
                provider = paymentMethod.provider
            )
            val response = apiService.addPaymentMethod(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val paymentDto = response.body()?.data
                if (paymentDto != null) {
                    refreshPaymentMethodsCache()
                    Result.success(paymentDto.toDomainModel())
                } else {
                    Result.failure(Exception("Failed to add payment method"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun deletePaymentMethod(paymentMethodId: String): Result<Unit> {
        return try {
            val response = apiService.deletePaymentMethod(paymentMethodId)
            if (response.isSuccessful) {
                refreshPaymentMethodsCache()
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private suspend fun refreshPaymentMethodsCache() {
        fetchPaymentMethodsFromApi()?.let { cachePaymentMethods(it) }
    }
    
    override suspend fun setDefaultPaymentMethod(paymentMethodId: String): Result<Unit> {
        return try {
            val response = apiService.setDefaultPaymentMethod(paymentMethodId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun getLastUsedPaymentMethod(): Result<PaymentMethod?> {
        return try {
            val json = sharedPreferences.getString(KEY_LAST_PAYMENT_METHOD, null)
            if (json != null) {
                val paymentMethod = gson.fromJson(json, PaymentMethod::class.java)
                Result.success(paymentMethod)
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun saveLastUsedPaymentMethod(paymentMethod: PaymentMethod): Result<Unit> {
        return try {
            val json = gson.toJson(paymentMethod)
            sharedPreferences.edit()
                .putString(KEY_LAST_PAYMENT_METHOD, json)
                .apply()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun PaymentMethodDto.toDomainModel(): PaymentMethod {
        return PaymentMethod(
            id = id,
            type = PaymentType.valueOf(type),
            displayName = displayName,
            isDefault = isDefault,
            lastFourDigits = lastFourDigits,
            provider = provider
        )
    }
}
