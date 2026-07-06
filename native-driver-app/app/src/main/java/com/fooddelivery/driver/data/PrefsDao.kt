package com.fooddelivery.driver.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PrefsDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun setDriverPrefs(prefs: DriverPrefsEntity)

    @Query("SELECT * FROM driver_prefs LIMIT 1")
    fun getDriverPrefs(): Flow<DriverPrefsEntity?>
}
