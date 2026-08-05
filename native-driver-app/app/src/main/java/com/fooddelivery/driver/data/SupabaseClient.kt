package com.fooddelivery.driver.data

import android.util.Log
import com.fooddelivery.driver.util.Resource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL

class SupabaseClient(
    private val supabaseUrl: String,
    private val supabaseAnonKey: String
) {
    companion object {
        private const val TAG = "SupabaseClient"
    }

    suspend fun callEdgeFunction(
        functionPath: String,
        method: String = "POST",
        body: JSONObject? = null,
        firebaseToken: String
    ): Resource<JSONObject> {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("$supabaseUrl/functions/v1/$functionPath")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = method
                connection.doOutput = body != null
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("apikey", supabaseAnonKey)
                connection.setRequestProperty("Authorization", "Bearer $firebaseToken")

                if (body != null) {
                    connection.outputStream.use { it.write(body.toString().toByteArray()) }
                }

                val responseCode = connection.responseCode
                val responseBody = if (responseCode in 200..299) {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } else {
                    val errorStream = connection.errorStream
                    if (errorStream != null) errorStream.bufferedReader().use { it.readText() } else ""
                }

                if (responseCode in 200..299) {
                    val response = JSONObject(responseBody)
                    Resource.success(response)
                } else {
                    Log.e(TAG, "Edge function failed: $responseCode - $responseBody")
                    Resource.error("Request failed: $responseBody")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Edge function exception", e)
                Resource.error("Error: ${e.message}")
            }
        }
    }
}
