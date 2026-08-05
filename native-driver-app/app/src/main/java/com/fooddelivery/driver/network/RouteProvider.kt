package com.fooddelivery.driver.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * A computed driving route from the Mapbox Directions API.
 */
data class RouteData(
    val points: List<Pair<Double, Double>>, // (lat, lng)
    val distanceMeters: Double,
    val durationSeconds: Double
) {
    val distanceKm: Double get() = distanceMeters / 1000.0
    val durationMinutes: Int get() = (durationSeconds / 60.0).toInt().coerceAtLeast(1)
}

/**
 * Fetches driving routes from the Mapbox Directions API v5.
 * Uses the public token from AppConfig; the free tier allows a limited
 * number of requests per day, which is fine for development.
 */
class RouteProvider(private val accessToken: String) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Fetches a route through the given waypoints (lat, lng).
     * Returns null when the request fails or no route exists.
     */
    suspend fun fetchRoute(waypoints: List<Pair<Double, Double>>): RouteData? = withContext(Dispatchers.IO) {
        if (waypoints.size < 2) return@withContext null
        try {
            val coords = waypoints.joinToString(";") { (lat, lng) -> "$lng,$lat" }
            val url = "https://api.mapbox.com/directions/v5/mapbox/driving/$coords" +
                "?access_token=$accessToken&geometries=geojson&overview=full&steps=false&language=en"

            val request = Request.Builder().url(url).build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val body = response.body?.string() ?: return@withContext null
                val root = JSONObject(body)
                val routes = root.optJSONArray("routes") ?: return@withContext null
                if (routes.length() == 0) return@withContext null

                val route = routes.getJSONObject(0)
                val geometry = route.optJSONObject("geometry") ?: return@withContext null
                val coordsArray = geometry.optJSONArray("coordinates") ?: return@withContext null

                val points = mutableListOf<Pair<Double, Double>>()
                for (i in 0 until coordsArray.length()) {
                    val c = coordsArray.getJSONArray(i)
                    points.add(Pair(c.getDouble(1), c.getDouble(0)))
                }
                if (points.isEmpty()) return@withContext null

                RouteData(
                    points = points,
                    distanceMeters = route.optDouble("distance", 0.0),
                    durationSeconds = route.optDouble("duration", 0.0)
                )
            }
        } catch (e: Exception) {
            null
        }
    }
}
