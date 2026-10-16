package com.smartsoko.admin.data.remote.interceptor

import com.smartsoko.admin.BuildConfig
import okhttp3.Interceptor
import okhttp3.Response

object TokenHolder {
    var token: String? = null
}

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = TokenHolder.token
        val builder = original.newBuilder()
            .header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .header("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
        if (!token.isNullOrEmpty()) {
            builder.header("x-firebase-token", token)
        }
        return chain.proceed(builder.build())
    }
}
