package com.smartsoko.admin.di

import com.smartsoko.admin.data.remote.api.AdminApiService
import com.smartsoko.admin.data.remote.network.ApiClient
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
    fun provideAdminApiService(): AdminApiService = ApiClient.adminApiService
}
