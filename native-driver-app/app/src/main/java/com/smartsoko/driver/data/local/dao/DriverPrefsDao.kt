package com.smartsoko.driver.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.smartsoko.driver.data.local.entity.DriverPrefsEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DriverPrefsDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(prefs: DriverPrefsEntity)

    @Query("SELECT * FROM driver_prefs WHERE id = 1")
    fun getPrefsFlow(): Flow<DriverPrefsEntity?>

    @Query("SELECT * FROM driver_prefs WHERE id = 1")
    suspend fun getPrefs(): DriverPrefsEntity?

    @Query("UPDATE driver_prefs SET isOnline = :isOnline")
    suspend fun setOnline(isOnline: Boolean)

    @Query("UPDATE driver_prefs SET activeOrderId = :orderId")
    suspend fun setActiveOrder(orderId: String?)

    @Query("UPDATE driver_prefs SET lastKnownLat = :lat, lastKnownLng = :lng, lastKnownBearing = :bearing")
    suspend fun updateLocation(lat: Double, lng: Double, bearing: Float)
}
