package com.smartsoko.customer.di

import android.content.Context
import androidx.room.Room
import com.smartsoko.customer.data.local.AppDatabase
import com.smartsoko.customer.data.local.AppDatabase.Companion.getDatabase
import com.smartsoko.customer.data.local.dao.AuthDao
import com.smartsoko.customer.data.local.dao.CartDao
import com.smartsoko.customer.data.local.dao.OrderDao
import com.smartsoko.customer.data.local.dao.ProductDao
import com.smartsoko.customer.data.local.entity.AuthEntity
import com.smartsoko.customer.data.local.entity.CartItemEntity
import com.smartsoko.customer.data.local.entity.OrderEntity
import com.smartsoko.customer.data.local.entity.PaymentMethodEntity
import com.smartsoko.customer.data.local.entity.ProductEntity
import com.smartsoko.customer.data.local.preferences.EncryptedPreferencesHelper
import com.smartsoko.customer.data.local.preferences.PreferencesHelper
import com.smartsoko.customer.data.remote.ApiService
import com.smartsoko.customer.data.remote.AuthApiService
import com.smartsoko.customer.data.remote.CartApiService
import com.smartsoko.customer.data.remote.OrderApiService
import com.smartsoko.customer.data.remote.ProductApiService
import com.smartsoko.customer.data.repository.AuthRepositoryImpl
import com.smartsoko.customer.data.repository.CartRepositoryImpl
import com.smartsoko.customer.data.repository.OrderRepositoryImpl
import com.smartsoko.customer.data.repository.ProductRepositoryImpl
import com.smartsoko.customer.domain.repository.AuthRepository
import com.smartsoko.customer.domain.repository.CartRepository
import com.smartsoko.customer.domain.repository.OrderRepository
import com.smartsoko.customer.domain.repository.ProductRepository
import com.smartsoko.customer.domain.usecase.auth.*
import com.smartsoko.customer.domain.usecase.cart.*
import com.smartsoko.customer.domain.usecase.order.*
import com.smartsoko.customer.domain.usecase.product.*
import com.smartsoko.customer.presentation.viewmodel.AuthViewModel
import com.smartsoko.customer.presentation.viewmodel.CartViewModel
import com.smartsoko.customer.presentation.viewmodel.HomeViewModel
import com.smartsoko.customer.presentation.viewmodel.OrderViewModel
import com.smartsoko.customer.presentation.viewmodel.ProductViewModel
import com.smartsoko.customer.presentation.viewmodel.ProfileViewModel
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPoint
import dagger.hilt.android.scopes.ActivityRetainedScoped
import dagger.hilt.android.scopes.ViewModelScoped
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

// Import all needed types
import android.content.Context
import androidx.room.Room
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.database.FirebaseDatabase
import com.smartsoko.customer.data.local.AppDatabase
import com.smartsoko.customer.data.local.dao.AuthDao
import com.smartsoko.customer.data.local.dao.CartDao
import com.smartsoko.customer.data.local.dao.OrderDao
import com.smartsoko.customer.data.local.dao.ProductDao
import com.smartsoko.customer.data.local.entity.AuthEntity
import com.smartsoko.customer.data.local.entity.CartItemEntity
import com.smartsoko.customer.data.local.entity.OrderEntity
import com.smartsoko.customer.data.local.entity.PaymentMethodEntity
import com.smartsoko.customer.data.local.entity.ProductEntity
import com.smartsoko.customer.data.local.preferences.EncryptedPreferencesHelper
import com.smartsoko.customer.data.local.preferences.PreferencesHelper
import com.smartsoko.customer.data.remote.ApiService
import com.smartsoko.customer.data.remote.AuthApiService
import com.smartsoko.customer.data.remote.CartApiService
import com.smartsoko.customer.data.remote.OrderApiService
import com.smartsoko.customer.data.remote.ProductApiService
import com.smartsoko.customer.data.repository.AuthRepositoryImpl
import com.smartsoko.customer.data.repository.CartRepositoryImpl
import com.smartsoko.customer.data.repository.OrderRepositoryImpl
import com.smartsoko.customer.data.repository.ProductRepositoryImpl
import com.smartsoko.customer.domain.repository.AuthRepository
import com.smartsoko.customer.domain.repository.CartRepository
import com.smartsoko.customer.domain.repository.OrderRepository
import com.smartsoko.customer.domain.repository.ProductRepository
import com.smartsoko.customer.domain.usecase.auth.*
import com.smartsoko.customer.domain.usecase.cart.*
import com.smartsoko.customer.domain.usecase.order.*
import com.smartsoko.customer.domain.usecase.product.*
import com.smartsoko.customer.presentation.viewmodel.AuthViewModel
import com.smartsoko.customer.presentation.viewmodel.CartViewModel
import com.smartsoko.customer.presentation.viewmodel.HomeViewModel
import com.smartsoko.customer.presentation.viewmodel.OrderViewModel
import com.smartsoko.customer.presentation.viewmodel.ProductViewModel
import com.smartsoko.customer.presentation.viewmodel.ProfileViewModel

// Re-import after ensuring clean import structure
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideMoshi(): com.squareup.moshi.Moshi {
        return com.squareup.moshi.Moshi.Builder()
            .add(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
            .build()
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(): okhttp3.OkHttpClient {
        val logging = okhttp3.logging.HttpLoggingInterceptor()
        logging.level = if (BuildConfig.DEBUG) 
            okhttp3.logging.HttpLoggingInterceptor.Level.BODY 
        else 
            okhttp3.logging.HttpLoggingInterceptor.Level.NONE
        
        return okhttp3.OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: okhttp3.OkHttpClient, 
        moshi: com.squareup.moshi.Moshi,
        @com.smartsoko.customer.di.ApplicationContext context: android.content.Context
    ): retrofit2.Retrofit {
        return retrofit2.Retrofit.Builder()
            .baseUrl("https://api.smartsoko.com/v1/")
            .client(okHttpClient)
            .addConverterFactory(retrofit2.converter.moshi.MoshiConverterFactory.create(moshi))
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: retrofit2.Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAuthApiService(retrofit: retrofit2.Retrofit): AuthApiService {
        return retrofit.create(AuthApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideProductApiService(retrofit: retrofit2.Retrofit): ProductApiService {
        return retrofit.create(ProductApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideCartApiService(retrofit: retrofit2.Retrofit): CartApiService {
        return retrofit.create(CartApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideOrderApiService(retrofit: retrofit2.Retrofit): OrderApiService {
        return retrofit.create(OrderApiService::class.java)
    }
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(context: android.content.Context): AppDatabase {
        return Room.databaseBuilder(
            context.applicationContext,
            AppDatabase::class.java,
            "smartsoko.db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthDao(database: AppDatabase): AuthDao {
        return database.authDao()
    }

    @Provides
    @Singleton
    fun provideProductDao(database: AppDatabase): com.smartsoko.customer.data.local.dao.ProductDao {
        return database.productDao()
    }

    @Provides
    @Singleton
    fun provideCartDao(database: AppDatabase): CartDao {
        return database.cartDao()
    }

    @Provides
    @Singleton
    fun provideOrderDao(database: AppDatabase): OrderDao {
        return database.orderDao()
    }
}

@Module
@InstallIn(SingletonComponent::class)
object FirebaseModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth {
        return FirebaseAuth.getInstance()
    }

    @Provides
    @Singleton
    fun provideFirebaseFirestore(): FirebaseFirestore {
        return FirebaseFirestore.getInstance()
    }

    @Provides
    @Singleton
    fun provideFirebaseDatabase(): FirebaseDatabase {
        return FirebaseDatabase.getInstance()
    }
}

@Module
@InstallIn(SingletonComponent::class)
object PreferencesModule {

    @Provides
    @Singleton
    fun providePreferencesHelper(@com.smartsoko.customer.di.ApplicationContext context: android.content.Context): PreferencesHelper {
        return EncryptedPreferencesHelper(context)
    }
}

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideAuthRepository(
        authApiService: AuthApiService,
        authDao: AuthDao,
        preferencesHelper: PreferencesHelper,
        firebaseAuth: FirebaseAuth
    ): AuthRepository {
        return AuthRepositoryImpl(authApiService, authDao, preferencesHelper, firebaseAuth)
    }

    @Provides
    @Singleton
    fun provideProductRepository(
        productApiService: ProductApiService,
        productDao: com.smartsoko.customer.data.local.dao.ProductDao
    ): ProductRepository {
        return ProductRepositoryImpl(productApiService, productDao)
    }

    @Provides
    @Singleton
    fun provideCartRepository(
        cartApiService: CartApiService,
        cartDao: CartDao,
        preferencesHelper: PreferencesHelper
    ): CartRepository {
        return CartRepositoryImpl(cartApiService, cartDao, preferencesHelper)
    }

    @Provides
    @Singleton
    fun provideOrderRepository(
        orderApiService: OrderApiService,
        orderDao: OrderDao,
        firebaseDatabase: FirebaseDatabase
    ): OrderRepository {
        return OrderRepositoryImpl(orderApiService, orderDao, firebaseDatabase)
    }
}

@Module
@InstallIn(SingletonComponent::class)
object UseCaseModule {

    @Provides
    @Singleton
    fun provideLoginUseCase(repository: AuthRepository): LoginUseCase {
        return LoginUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideVerifyOtpUseCase(repository: AuthRepository): VerifyOtpUseCase {
        return VerifyOtpUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideRegisterUseCase(repository: AuthRepository): RegisterUseCase {
        return RegisterUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideLogoutUseCase(repository: AuthRepository): LogoutUseCase {
        return LogoutUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideGetCurrentUserUseCase(repository: AuthRepository): GetCurrentUserUseCase {
        return GetCurrentUserUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideGetProductsUseCase(repository: ProductRepository): GetProductsUseCase {
        return GetProductsUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideGetProductDetailsUseCase(repository: ProductRepository): GetProductDetailsUseCase {
        return GetProductDetailsUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideSearchProductsUseCase(repository: ProductRepository): SearchProductsUseCase {
        return SearchProductsUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideGetCategoriesUseCase(repository: ProductRepository): GetCategoriesUseCase {
        return GetCategoriesUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideGetCartUseCase(repository: CartRepository): GetCartUseCase {
        return GetCartUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideAddToCartUseCase(repository: CartRepository): AddToCartUseCase {
        return AddToCartUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideUpdateCartItemUseCase(repository: CartRepository): UpdateCartItemUseCase {
        return UpdateCartItemUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideRemoveFromCartUseCase(repository: CartRepository): RemoveFromCartUseCase {
        return RemoveFromCartUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideClearCartUseCase(repository: CartRepository): ClearCartUseCase {
        return ClearCartUseCase(repository)
    }

    @Provides
    @Singleton
    fun providePlaceOrderUseCase(repository: OrderRepository): PlaceOrderUseCase {
        return PlaceOrderUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideGetOrdersUseCase(repository: OrderRepository): GetOrdersUseCase {
        return GetOrdersUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideGetOrderDetailsUseCase(repository: OrderRepository): GetOrderDetailsUseCase {
        return GetOrderDetailsUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideTrackOrderUseCase(repository: OrderRepository): TrackOrderUseCase {
        return TrackOrderUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideCancelOrderUseCase(repository: OrderRepository): CancelOrderUseCase {
        return CancelOrderUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideRateOrderUseCase(repository: OrderRepository): RateOrderUseCase {
        return RateOrderUseCase(repository)
    }

    @Provides
    @Singleton
    fun provideReorderUseCase(repository: OrderRepository): ReorderUseCase {
        return ReorderUseCase(repository)
    }
}

@Module
@InstallIn(SingletonComponent::class)
object ViewModelModule {

    @Provides
    @ActivityRetainedScoped
    fun provideAuthViewModel(
        loginUseCase: LoginUseCase,
        verifyOtpUseCase: VerifyOtpUseCase,
        registerUseCase: RegisterUseCase,
        logoutUseCase: LogoutUseCase,
        getCurrentUserUseCase: GetCurrentUserUseCase
    ): AuthViewModel {
        return AuthViewModel(
            loginUseCase = loginUseCase,
            verifyOtpUseCase = verifyOtpUseCase,
            registerUseCase = registerUseCase,
            logoutUseCase = logoutUseCase,
            getCurrentUserUseCase = getCurrentUserUseCase
        )
    }

    @Provides
    @ActivityRetainedScoped
    fun provideHomeViewModel(
        getProductsUseCase: GetProductsUseCase,
        getCategoriesUseCase: GetCategoriesUseCase,
        searchProductsUseCase: SearchProductsUseCase
    ): HomeViewModel {
        return HomeViewModel(
            getProductsUseCase = getProductsUseCase,
            getCategoriesUseCase = getCategoriesUseCase,
            searchProductsUseCase = searchProductsUseCase
        )
    }

    @Provides
    @ActivityRetainedScoped
    fun provideProductViewModel(
        getProductDetailsUseCase: GetProductDetailsUseCase,
        addToCartUseCase: AddToCartUseCase
    ): ProductViewModel {
        return ProductViewModel(
            getProductDetailsUseCase = getProductDetailsUseCase,
            addToCartUseCase = addToCartUseCase
        )
    }

    @Provides
    @ActivityRetainedScoped
    fun provideCartViewModel(
        getCartUseCase: GetCartUseCase,
        addToCartUseCase: AddToCartUseCase,
        updateCartItemUseCase: UpdateCartItemUseCase,
        removeFromCartUseCase: RemoveFromCartUseCase,
        clearCartUseCase: ClearCartUseCase
    ): CartViewModel {
        return CartViewModel(
            getCartUseCase = getCartUseCase,
            addToCartUseCase = addToCartUseCase,
            updateCartItemUseCase = updateCartItemUseCase,
            removeFromCartUseCase = removeFromCartUseCase,
            clearCartUseCase = clearCartUseCase
        )
    }

    @Provides
    @ActivityRetainedScoped
    fun provideOrderViewModel(
        placeOrderUseCase: PlaceOrderUseCase,
        getOrdersUseCase: GetOrdersUseCase,
        getOrderDetailsUseCase: GetOrderDetailsUseCase,
        trackOrderUseCase: TrackOrderUseCase,
        cancelOrderUseCase: CancelOrderUseCase,
        rateOrderUseCase: RateOrderUseCase,
        reorderUseCase: ReorderUseCase
    ): OrderViewModel {
        return OrderViewModel(
            placeOrderUseCase = placeOrderUseCase,
            getOrdersUseCase = getOrdersUseCase,
            getOrderDetailsUseCase = getOrderDetailsUseCase,
            trackOrderUseCase = trackOrderUseCase,
            cancelOrderUseCase = cancelOrderUseCase,
            rateOrderUseCase = rateOrderUseCase,
            reorderUseCase = reorderUseCase
        )
    }

    @Provides
    @ActivityRetainedScoped
    fun provideProfileViewModel(
        getCurrentUserUseCase: GetCurrentUserUseCase,
        logoutUseCase: LogoutUseCase
    ): ProfileViewModel {
        return ProfileViewModel(
            getCurrentUserUseCase = getCurrentUserUseCase,
            logoutUseCase = logoutUseCase
        )
    }
}