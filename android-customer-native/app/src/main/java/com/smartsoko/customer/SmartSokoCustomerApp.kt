package com.smartsoko.customer

import android.app.Application
import com.smartsoko.customer.domain.repository.ProductRepository
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class SmartSokoCustomerApp : Application() {

    @Inject lateinit var productRepository: ProductRepository

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        applicationScope.launch {
            productRepository.refreshProducts()
        }
    }
}