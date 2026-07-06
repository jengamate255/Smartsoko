package com.fooddelivery.driver.data

import android.util.Log
import com.fooddelivery.driver.util.Resource
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.async
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Simple Supabase client for authentication and basic database operations
 * Limited to auth and database as requested
 */
class SupabaseClient(
    private val supabaseUrl: String,
    private val supabaseAnonKey: String
) {

    companion object {
        private const val TAG = "SupabaseClient"
    }

    suspend fun signIn(email: String, password: String): Resource<JSONObject> {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("$supabaseUrl/auth/v1/token?grant_type=password")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("apikey", supabaseAnonKey)
                connection.setRequestProperty("Authorization", "Bearer $supabaseAnonKey")

                val json = JSONObject().apply {
                    put("email", email)
                    put("password", password)
                }

                connection.outputStream.use { it.write(json.toString().toByteArray()) }

                val responseCode = connection.responseCode
                val responseBody = connection.inputStream.bufferedReader().use { it.readText() }

                if (responseCode in 200..299) {
                    val response = JSONObject(responseBody)
                    Resource.success(response)
                } else {
                    Log.e(TAG, "Sign in failed: $responseCode - $responseBody")
                    Resource.error("Sign in failed: $responseBody")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Sign in exception", e)
                Resource.error("Sign in error: ${e.message}")
            }
        }
    }

    // Additional methods for database operations would go here
    // For now, we're limiting Supabase to auth as requested
}