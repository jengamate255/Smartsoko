package com.smartsoko.driver.service

import com.smartsoko.driver.domain.model.Location
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationState @Inject constructor() {
    private val _location = MutableStateFlow<Location?>(null)
    val location: StateFlow<Location?> = _location

    private val _isTracking = MutableStateFlow(false)
    val isTracking: StateFlow<Boolean> = _isTracking

    fun update(loc: Location) {
        _location.value = loc
    }

    fun setTracking(active: Boolean) {
        _isTracking.value = active
    }
}
