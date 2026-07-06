package com.fooddelivery.driver.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkInfo

/**
 * Utility class to check network connectivity.
 */
object NetworkUtils {
    /**
     * Checks if the device has an active internet connection.
     *
     * @param context The application context
     * @return true if connected to the internet, false otherwise
     */
    fun isConnected(context: Context): Boolean {
        val connectivityManager =
            context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        if (connectivityManager != null) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val activeNetwork = connectivityManager.activeNetwork
                if (activeNetwork != null) {
                    val networkCapabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
                    return networkCapabilities != null &&
                            networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                }
            } else {
                // Deprecated in API 28 but still used for older versions
                @Suppress("DEPRECATION")
                val activeNetworkInfo = connectivityManager.activeNetworkInfo
                return activeNetworkInfo != null && activeNetworkInfo.isConnected
            }
        }
        return false
    }

    /**
     * Checks if the device is connected to a WiFi network.
     *
     * @param context The application context
     * @return true if connected to WiFi, false otherwise
     */
    fun isConnectedToWifi(context: Context): Boolean {
        val connectivityManager =
            context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        if (connectivityManager != null) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val activeNetwork = connectivityManager.activeNetwork
                if (activeNetwork != null) {
                    val networkCapabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
                    return networkCapabilities != null &&
                            networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                }
            } else {
                // Deprecated in API 28 but still used for older versions
                @Suppress("DEPRECATION")
                val activeNetworkInfo = connectivityManager.activeNetworkInfo
                return activeNetworkInfo != null &&
                        activeNetworkInfo.type == ConnectivityManager.TYPE_WIFI &&
                        activeNetworkInfo.isConnected
            }
        }
        return false
    }
}