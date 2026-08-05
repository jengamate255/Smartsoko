package com.smartsoko.customer.data.remote.network

import android.util.Log
import com.smartsoko.customer.BuildConfig
import com.smartsoko.customer.data.remote.api.RefreshTokenRequestDto
import com.smartsoko.customer.data.remote.api.RefreshTokenResponseDto
import com.smartsoko.customer.data.remote.api.SmartsokoApiService
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiClient @Inject constructor() {

    companion object {
        private const val TIMEOUT = 30L
        private const val TAG = "ApiClient"
    }

    var authToken: String? = null
        private set

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }

    private var refreshToken: String? = null
    private var isRefreshing = false
    private val refreshLock = Any()

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(TIMEOUT, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT, TimeUnit.SECONDS)
        .addInterceptor(AuthInterceptor())
        .addInterceptor(TokenRefreshInterceptor())
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: SmartsokoApiService = retrofit.create(SmartsokoApiService::class.java)

    fun updateAuthToken(token: String?, refresh: String? = null) {
        authToken = token
        refreshToken = refresh
    }

    fun clearAuthToken() {
        authToken = null
        refreshToken = null
    }

    inner class AuthInterceptor : Interceptor {
        @Throws(IOException::class)
        override fun intercept(chain: Interceptor.Chain): Response {
            val original = chain.request()
            val requestBuilder = original.newBuilder()
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
            authToken?.let {
                requestBuilder.header("Authorization", "Bearer $it")
            }
            return chain.proceed(requestBuilder.build())
        }
    }

    inner class TokenRefreshInterceptor : Interceptor {
        @Throws(IOException::class)
        override fun intercept(chain: Interceptor.Chain): Response {
            var request = chain.request()
            var response = chain.proceed(request)

            if (response.code == 401 && refreshToken != null && !isRefreshing) {
                synchronized(refreshLock) {
                    if (!isRefreshing) {
                        isRefreshing = true
                        try {
                            val newTokens = refreshAccessToken()
                            if (newTokens != null) {
                                updateAuthToken(newTokens.access_token, newTokens.refresh_token)
                                request = request.newBuilder()
                                    .header("Authorization", "Bearer ${newTokens.access_token}")
                                    .build()
                                response.close()
                                response = chain.proceed(request)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Token refresh failed", e)
                            clearAuthToken()
                        } finally {
                            isRefreshing = false
                        }
                    }
                }
            }
            return response
        }

        private fun refreshAccessToken(): RefreshTokenResponseDto? {
            return try {
                val json = Gson().toJson(RefreshTokenRequestDto(refreshToken!!))
                val requestBody = RequestBody.create(
                    "application/json".toMediaTypeOrNull(),
                    json
                )
                val request = Request.Builder()
                    .url("${BuildConfig.API_BASE_URL}auth/refresh")
                    .post(requestBody)
                    .addHeader("Accept", "application/json")
                    .addHeader("Content-Type", "application/json")
                    .build()

                val syncClient = OkHttpClient.Builder()
                    .connectTimeout(TIMEOUT, TimeUnit.SECONDS)
                    .readTimeout(TIMEOUT, TimeUnit.SECONDS)
                    .writeTimeout(TIMEOUT, TimeUnit.SECONDS)
                    .build()

                val response = syncClient.newCall(request).execute()

                if (response.isSuccessful) {
                    val responseBody = response.body?.string() ?: return null
                    val type = object : TypeToken<RefreshApiResponse<RefreshTokenResponseDto>>() {}.type
                    val apiResponse: RefreshApiResponse<RefreshTokenResponseDto> = Gson().fromJson(responseBody, type)
                    if (apiResponse.success && apiResponse.data != null) {
                        apiResponse.data
                    } else {
                        Log.e(TAG, "Token refresh failed: ${apiResponse.message}")
                        null
                    }
                } else {
                    Log.e(TAG, "Token refresh failed: ${response.code}")
                    null
                }
            } catch (e: Exception) {
                Log.e(TAG, "Token refresh error", e)
                null
            }
        }
    }
}

data class RefreshApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val error: String? = null
)
