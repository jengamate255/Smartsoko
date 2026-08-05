package com.smartsoko.customer.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.smartsoko.customer.data.local.entity.AuthEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AuthDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(auth: AuthEntity)

    @Update
    suspend fun update(auth: AuthEntity)

    @Query("SELECT * FROM auth WHERE id = :id")
    fun getAuthById(id: String): Flow<AuthEntity?>

    @Query("SELECT * FROM auth WHERE userId = :userId")
    fun getAuthByUserId(userId: String): Flow<AuthEntity?>

    @Query("SELECT * FROM auth WHERE expiresAt < :currentTime")
    suspend fun deleteExpiredAuth(currentTime: Long)

    @Query("DELETE FROM auth")
    suspend fun clearAllAuth()
}