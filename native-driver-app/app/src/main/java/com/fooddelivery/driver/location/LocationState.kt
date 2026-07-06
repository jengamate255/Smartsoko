package com.fooddelivery.driver.location

import android.location.Location
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationState @Inject constructor() {
    private val _location = MutableStateFlow<Location?>(null)
    val location: StateFlow<Location?> = _location

    fun update(location: Location) {
        _location.value = location
    }
}
