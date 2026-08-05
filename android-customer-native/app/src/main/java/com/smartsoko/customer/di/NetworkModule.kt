package com.smartsoko.customer.di

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.smartsoko.customer.data.remote.api.SmartsokoApiService
import com.smartsoko.customer.data.remote.network.ApiClient
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            .setLenient()
            .create()
    }
    
    @Provides
    @Singleton
    fun provideApiService(apiClient: ApiClient): SmartsokoApiService {
        return apiClient.apiService
    }
}
