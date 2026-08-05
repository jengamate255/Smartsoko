package com.smartsoko.driver.data.repository

import com.smartsoko.driver.data.local.AppDatabase
import com.smartsoko.driver.data.local.entity.DriverPrefsEntity
import com.smartsoko.driver.data.remote.WebSocketManager
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DriverRepository @Inject constructor(
    private val db: AppDatabase,
    private val ws: WebSocketManager
) {
    private val prefsDao = db.driverPrefsDao()

    fun getPrefsFlow(): Flow<DriverPrefsEntity?> = prefsDao.getPrefsFlow()

    suspend fun getPrefs(): DriverPrefsEntity? = prefsDao.getPrefs()

    suspend fun setOnline(isOnline: Boolean) {
        prefsDao.setOnline(isOnline)
        if (isOnline) ws.goOnline() else ws.goOffline()
    }

    suspend fun setActiveOrder(orderId: String?) = prefsDao.setActiveOrder(orderId)

    suspend fun updateLocation(lat: Double, lng: Double, bearing: Float) =
        prefsDao.updateLocation(lat, lng, bearing)

    suspend fun initPrefs() {
        if (prefsDao.getPrefs() == null) {
            prefsDao.upsert(DriverPrefsEntity())
        }
    }
}
