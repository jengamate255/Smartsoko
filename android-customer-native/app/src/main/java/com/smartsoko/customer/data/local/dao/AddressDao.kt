package com.smartsoko.customer.data.local.dao

import androidx.room.*
import com.smartsoko.customer.data.local.entity.AddressEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AddressDao {
    
    @Query("SELECT * FROM addresses WHERE id = :addressId")
    suspend fun getAddressById(addressId: String): AddressEntity?
    
    @Query("SELECT * FROM addresses WHERE userId = :userId ORDER BY isDefault DESC")
    fun getAddressesByUserId(userId: String): Flow<List<AddressEntity>>
    
    @Query("SELECT * FROM addresses WHERE userId = :userId AND isDefault = 1 LIMIT 1")
    suspend fun getDefaultAddress(userId: String): AddressEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAddress(address: AddressEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAddresses(addresses: List<AddressEntity>)
    
    @Update
    suspend fun updateAddress(address: AddressEntity)
    
    @Query("UPDATE addresses SET isDefault = 0 WHERE userId = :userId")
    suspend fun clearDefaultAddress(userId: String)
    
    @Query("UPDATE addresses SET isDefault = 1 WHERE id = :addressId")
    suspend fun setDefaultAddress(addressId: String)
    
    @Delete
    suspend fun deleteAddress(address: AddressEntity)
    
    @Query("DELETE FROM addresses WHERE userId = :userId")
    suspend fun deleteAddressesByUserId(userId: String)
}
