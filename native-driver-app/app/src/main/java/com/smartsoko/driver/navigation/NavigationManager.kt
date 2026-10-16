package com.smartsoko.driver.navigation

import android.content.Context
import android.location.Location
import android.speech.tts.TextToSpeech
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import com.fooddelivery.driver.network.RouteData
import com.fooddelivery.driver.network.RouteProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Turn-by-turn navigation manager using Mapbox Directions API.
 * Provides maneuver instructions, voice guidance, and rerouting without requiring
 * the paid Mapbox Navigation SDK.
 */
class NavigationManager(
    private val context: Context,
    private val routeProvider: RouteProvider
) : LifecycleEventObserver, TextToSpeech.OnInitListener {

    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val _navigationState = MutableStateFlow<NavigationState>(NavigationState.Idle)
    val navigationState: StateFlow<NavigationState> = _navigationState

    private var tts: TextToSpeech? = null
    private var isTtsReady = false
    private var voiceEnabled = true
    private var voiceVolume = 1.0f
    private var currentRoute: RouteData? = null
    private var currentStepIndex = 0
    private var isNavigating = false
    private var lastLocation: Location? = null

    init {
        tts = TextToSpeech(context, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isTtsReady = true
            tts?.setLanguage(java.util.Locale.US)
            tts?.setSpeechRate(1.0f)
        }
    }

    fun initialize(accessToken: String) {
        // Access token not needed for our custom implementation
    }

    fun startNavigation(waypoints: List<Pair<Double, Double>>) {
        if (waypoints.size < 2) return

        _navigationState.value = NavigationState.Loading

        scope.launch {
            val route = routeProvider.fetchRoute(waypoints)
            if (route == null) {
                _navigationState.value = NavigationState.Error("Failed to fetch route")
                return@launch
            }

            currentRoute = route
            currentStepIndex = 0
            isNavigating = true

            val maneuvers = generateManeuvers(route)

            _navigationState.value = NavigationState.Navigating(
                route = route,
                currentStep = 0,
                distanceRemaining = route.distanceMeters,
                durationRemaining = route.durationSeconds,
                maneuvers = maneuvers,
                nextManeuver = maneuvers.firstOrNull()
            )

            maneuvers.firstOrNull()?.let { announceManeuver(it, isFirst = true) }
        }
    }

    fun updateLocation(location: Location) {
        lastLocation = location

        if (!isNavigating || currentRoute == null) return

        val nextWaypoint = if (currentStepIndex + 1 < currentRoute!!.points.size)
            currentRoute!!.points[currentStepIndex + 1] else null

        if (nextWaypoint != null) {
            val distanceToNext = location.distanceTo(
                Location("").apply { latitude = nextWaypoint.first; longitude = nextWaypoint.second }
            )

            if (distanceToNext < 30 && currentStepIndex < currentRoute!!.points.size - 1) {
                advanceStep()
            }
        }

        val route = currentRoute!!
        val progress = calculateProgress(route, location)
        val distanceRemaining = route.distanceMeters * (1 - progress)
        val durationRemaining = route.durationSeconds * (1 - progress)

        val maneuvers = generateManeuvers(route)
        val nextManeuver = if (currentStepIndex + 1 < maneuvers.size) maneuvers[currentStepIndex + 1] else null

        _navigationState.value = NavigationState.Navigating(
            route = route,
            currentStep = currentStepIndex,
            distanceRemaining = distanceRemaining,
            durationRemaining = durationRemaining,
            maneuvers = maneuvers,
            nextManeuver = nextManeuver
        )
    }

    private fun advanceStep() {
        currentStepIndex++
        val maneuvers = generateManeuvers(currentRoute!!)

        if (currentStepIndex >= currentRoute!!.points.size - 1) {
            stopNavigation()
            _navigationState.value = NavigationState.Arrived
            speak("You have arrived at your destination")
        } else if (currentStepIndex < maneuvers.size) {
            val nextManeuver = maneuvers[currentStepIndex]
            announceManeuver(nextManeuver)
        }
    }

    private fun calculateProgress(route: RouteData, location: Location): Float {
        val dest = route.points.last()
        val destLocation = Location("").apply { latitude = dest.first; longitude = dest.second }
        val totalDistance = route.distanceMeters.toFloat()
        val remainingDistance = location.distanceTo(destLocation).toFloat()
        return if (totalDistance > 0) (1f - remainingDistance / totalDistance).coerceIn(0f, 1f) else 1f
    }

    private fun generateManeuvers(route: RouteData): List<Maneuver> {
        val maneuvers = mutableListOf<Maneuver>()
        val points = route.points

        for (i in 1 until points.size - 1) {
            val prev = points[i - 1]
            val curr = points[i]
            val next = points[i + 1]

            val bearing1 = bearing(prev, curr)
            val bearing2 = bearing(curr, next)
            val turnAngle = (bearing2 - bearing1 + 360) % 360

            val instruction = when {
                turnAngle < 30 || turnAngle > 330 -> "Continue straight"
                turnAngle < 150 -> "Turn right"
                turnAngle < 210 -> "Make a U-turn"
                else -> "Turn left"
            }

            val distanceToManeuver = if (i == 1) 0.0 else {
                points.take(i).fold(0.0) { acc, pt ->
                    val idx = points.indexOf(pt)
                    if (idx > 0) {
                        val prevPt = points[idx - 1]
                        acc + distance(prevPt, pt)
                    } else acc
                }
            }

            maneuvers.add(Maneuver(
                instruction = instruction,
                distanceMeters = distanceToManeuver,
                maneuverType = when {
                    instruction.contains("right") -> "right"
                    instruction.contains("left") -> "left"
                    instruction.contains("U-turn") -> "uturn"
                    else -> "straight"
                },
                streetName = ""
            ))
        }

        if (points.size > 1) {
            maneuvers.add(Maneuver(
                instruction = "Arrive at destination",
                distanceMeters = route.distanceMeters,
                maneuverType = "arrive",
                streetName = ""
            ))
        }

        return maneuvers
    }

    private fun bearing(from: Pair<Double, Double>, to: Pair<Double, Double>): Double {
        val lat1 = Math.toRadians(from.first)
        val lat2 = Math.toRadians(to.first)
        val deltaLon = Math.toRadians(to.second - from.second)

        val y = Math.sin(deltaLon) * Math.cos(lat2)
        val x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)
        val bearing = Math.toDegrees(Math.atan2(y, x))
        return (bearing + 360) % 360
    }

    private fun distance(from: Pair<Double, Double>, to: Pair<Double, Double>): Double {
        val R = 6371000.0
        val lat1 = Math.toRadians(from.first)
        val lat2 = Math.toRadians(to.first)
        val deltaLat = Math.toRadians(to.first - from.first)
        val deltaLon = Math.toRadians(to.second - from.second)

        val a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    private fun announceManeuver(maneuver: Maneuver, isFirst: Boolean = false) {
        if (!voiceEnabled || !isTtsReady) return

        val text = if (isFirst) {
            "Start navigation. ${maneuver.instruction} in ${formatDistance(maneuver.distanceMeters)}"
        } else {
            "${maneuver.instruction} in ${formatDistance(maneuver.distanceMeters)}"
        }
        speak(text)
    }

    private fun speak(text: String) {
        if (!voiceEnabled || !isTtsReady) return
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "navigation_${System.currentTimeMillis()}")
    }

    private fun formatDistance(meters: Double): String {
        return if (meters < 1000) "${meters.toInt()} meters" else "${(meters / 1000).toString().substring(0, 3)} km"
    }

    fun setVoiceGuidanceEnabled(enabled: Boolean) {
        voiceEnabled = enabled
    }

    fun setVoiceVolume(volume: Float) {
        voiceVolume = volume.coerceIn(0f, 1f)
    }

    fun stopNavigation() {
        isNavigating = false
        currentRoute = null
        currentStepIndex = 0
        tts?.stop()
    }

    fun destroy() {
        stopNavigation()
        tts?.shutdown()
        tts = null
        scope.cancel()
    }

    override fun onStateChanged(source: androidx.lifecycle.LifecycleOwner, event: androidx.lifecycle.Lifecycle.Event) {
        when (event) {
            androidx.lifecycle.Lifecycle.Event.ON_DESTROY -> destroy()
            else -> {}
        }
    }

    }

/**
 * Navigation state sealed class for Compose UI consumption.
 */
sealed class NavigationState {
    object Idle : NavigationState()
    object Loading : NavigationState()
    data class Navigating(
        val route: com.fooddelivery.driver.network.RouteData,
        val currentStep: Int = 0,
        val distanceRemaining: Double = 0.0,
        val durationRemaining: Double = 0.0,
        val maneuvers: List<Maneuver> = emptyList(),
        val nextManeuver: Maneuver? = null
    ) : NavigationState()
    object Arrived : NavigationState()
    data class Error(val message: String) : NavigationState()
}

data class Maneuver(
    val instruction: String,
    val distanceMeters: Double,
    val maneuverType: String,
    val streetName: String
)