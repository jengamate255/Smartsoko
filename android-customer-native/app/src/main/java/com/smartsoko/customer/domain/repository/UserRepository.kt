package com.smartsoko.customer.domain.repository

import com.smartsoko.customer.domain.model.Address
import com.smartsoko.customer.domain.model.User
import com.smartsoko.customer.domain.model.UserProfile
import kotlinx.coroutines.flow.Flow

interface UserRepository {
    fun getUserProfile(): Flow<UserProfile?>
    suspend fun updateUserProfile(name: String?, email: String?, imageUrl: String?): Result<User>
    suspend fun addAddress(address: Address): Result<Address>
    suspend fun updateAddress(address: Address): Result<Address>
    suspend fun deleteAddress(addressId: String): Result<Unit>
    suspend fun setDefaultAddress(addressId: String): Result<Unit>
}
