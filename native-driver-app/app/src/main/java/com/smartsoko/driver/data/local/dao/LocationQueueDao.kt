package com.smartsoko.driver.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsoko.driver.data.local.entity.LocationQueueEntity

@Dao
interface LocationQueueDao {
    @Insert
    suspend fun enqueue(location: LocationQueueEntity)

    @Query("SELECT * FROM location_queue WHERE isSent = 0 ORDER BY id ASC LIMIT 50")
    suspend fun getPendingLocations(): List<LocationQueueEntity>

    @Query("UPDATE location_queue SET isSent = 1 WHERE id IN (:ids)")
    suspend fun markSent(ids: List<Long>)

    @Query("DELETE FROM location_queue WHERE isSent = 1")
    suspend fun clearSent()

    @Query("DELETE FROM location_queue WHERE timestamp < :before")
    suspend fun clearOld(before: Long)
}
