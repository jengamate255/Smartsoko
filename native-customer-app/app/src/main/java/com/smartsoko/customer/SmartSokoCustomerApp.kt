package com.smartsoko.customer

import android.app.Application
import android.content.Context
import dagger.hilt.android.HiltAndroidApp
import dagger.hilt.android.content.ContextEntryPoint
import dagger.hilt.android.content.EntryPointAccessors
import dagger.hilt.android.internal.ENTRY_POINT_CLASSES
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import com.smartsoko.customer.di.HiltEntryPoints
import com.smartsoko.customer.data.repository.AuthRepositoryImpl
import com.smartsoko.customer.data.repository.CartRepositoryImpl
import com.smartsoko.customer.data.repository.OrderRepositoryImpl
import com.smartsoko.customer.data.repository.ProductRepositoryImpl
import com.smartsoko.customer.domain.repository.AuthRepository
import com.smartsoko.customer.domain.repository.CartRepository
import com.smartsoko.customer.domain.repository.OrderRepository
import com.smartsoko.customer.domain.repository.ProductRepository
import com.smartsoko.customer.presentation.viewmodel.AuthViewModel
import com.smartsoko.customer.presentation.viewmodel.CartViewModel
import com.smartsoko.customer.presentation.viewmodel.HomeViewModel
import com.smartsoko.customer.presentation.viewmodel.OrderViewModel
import com.smartsoko.customer.presentation.viewmodel.ProductViewModel
import com.smartsoko.customer.presentation.viewmodel.ProfileViewModel

@HiltAndroidApp
class SmartSokoCustomerApp : Application() {

    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onCreate() {
        super.onCreate()
        
        // Initialize WorkManager if needed
        // WorkManager.initialize(this, Configuration.Builder().build())
        
        // Initialize any other libraries
        // Firebase is auto-initialized
    }

    // Helper to get ViewModels from Hilt
    fun getAuthViewModel(): AuthViewModel {
        return getEntryPoint<HiltEntryPoints.ViewModelEntryPoint>().authViewModel()
    }

    fun getHomeViewModel(): HomeViewModel {
        return getEntryPoint<HiltEntryPoints.ViewModelEntryPoint>().homeViewModel()
    }

    fun getProductViewModel(): ProductViewModel {
        return getEntryPoint<HiltEntryPoints.ViewModelEntryPoint>().productViewModel()
    }

    fun getCartViewModel(): CartViewModel {
        return getEntryPoint<HiltEntryPoints.ViewModelEntryPoint>().cartViewModel()
    }

    fun getOrderViewModel(): OrderViewModel {
        return getEntryPoint<HiltEntryPoints.ViewModelEntryPoint>().orderViewModel()
    }

    fun getProfileViewModel(): ProfileViewModel {
        return getEntryPoint<HiltEntryPoints.ViewModelEntryPoint>().profileViewModel()
    }

    // Helper to get Repositories
    fun getAuthRepository(): AuthRepository {
        return getEntryPoint<HiltEntryPoints.RepositoryEntryPoint>().authRepository()
    }

    fun getProductRepository(): ProductRepository {
        return getEntryPoint<HiltEntryPoints.RepositoryEntryPoint>().productRepository()
    }

    fun getCartRepository(): CartRepository {
        return getEntryPoint<HiltEntryPoints.RepositoryEntryPoint>().cartRepository()
    }

    fun getOrderRepository(): OrderRepository {
        return getEntryPoint<HiltEntryPoints.RepositoryEntryPoint>().orderRepository()
    }

    // Coroutine scope for app-level operations
    val appCoroutineScope: CoroutineScope
        get() = coroutineScope
}