package com.smartsoko.customer.data.repository

import com.google.gson.Gson
import com.smartsoko.customer.data.local.dao.AddressDao
import com.smartsoko.customer.data.local.dao.UserDao
import com.smartsoko.customer.data.local.entity.AddressEntity
import com.smartsoko.customer.data.local.entity.UserEntity
import com.smartsoko.customer.data.remote.api.CreateAddressRequestDto
import com.smartsoko.customer.data.remote.api.SmartsokoApiService
import com.smartsoko.customer.data.remote.api.UpdateAddressRequestDto
import com.smartsoko.customer.data.remote.api.UpdateUserProfileRequestDto
import com.smartsoko.customer.data.remote.dto.AddressDto
import com.smartsoko.customer.data.remote.dto.UserDto
import com.smartsoko.customer.domain.model.Address
import com.smartsoko.customer.domain.model.Location
import com.smartsoko.customer.domain.model.PaymentMethod
import com.smartsoko.customer.domain.model.User
import com.smartsoko.customer.domain.model.UserProfile
import com.smartsoko.customer.domain.repository.AuthRepository
import com.smartsoko.customer.domain.repository.UserRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class UserRepositoryImpl @Inject constructor(
    private val userDao: UserDao,
    private val addressDao: AddressDao,
    private val apiService: SmartsokoApiService,
    private val gson: Gson,
    private val authRepository: AuthRepository
) : UserRepository {
    
    override fun getUserProfile(): Flow<UserProfile?> {
        return flow {
            val userId = authRepository.getCurrentUserId() ?: ""
            if (userId.isEmpty()) {
                emit(null)
                return@flow
            }
            val userFlow = userDao.getUserByIdFlow(userId)
            val addressesFlow = addressDao.getAddressesByUserId(userId)
            emitAll(combine(userFlow, addressesFlow) { user, addresses ->
                if (user != null) {
                    UserProfile(
                        user = user.toDomainModel(),
                        addresses = addresses.map { it.toDomainModel() },
                        savedPaymentMethods = emptyList(),
                        defaultAddressId = addresses.firstOrNull { it.isDefault }?.id
                    )
                } else {
                    null
                }
            })
        }
    }
    
    override suspend fun updateUserProfile(
        name: String?,
        email: String?,
        imageUrl: String?
    ): Result<User> {
        return try {
            val request = UpdateUserProfileRequestDto(name, email, imageUrl)
            val response = apiService.updateUserProfile(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val userDto = response.body()?.data
                if (userDto != null) {
                    val entity = userDto.toEntity()
                    userDao.updateUser(entity)
                    Result.success(entity.toDomainModel())
                } else {
                    Result.failure(Exception("Failed to update profile"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun addAddress(address: Address): Result<Address> {
        return try {
            val request = CreateAddressRequestDto(
                title = address.title,
                fullName = address.fullName,
                phoneNumber = address.phoneNumber,
                streetAddress = address.streetAddress,
                apartment = address.apartment,
                city = address.city,
                postalCode = address.postalCode,
                latitude = address.location.latitude,
                longitude = address.location.longitude,
                address = address.location.address,
                deliveryInstructions = address.deliveryInstructions
            )
            val response = apiService.createAddress(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val addressDto = response.body()?.data
                if (addressDto != null) {
                    val entity = addressDto.toEntity()
                    addressDao.insertAddress(entity)
                    Result.success(entity.toDomainModel())
                } else {
                    Result.failure(Exception("Failed to add address"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun updateAddress(address: Address): Result<Address> {
        return try {
            val request = UpdateAddressRequestDto(
                title = address.title,
                fullName = address.fullName,
                phoneNumber = address.phoneNumber,
                streetAddress = address.streetAddress,
                apartment = address.apartment,
                city = address.city,
                postalCode = address.postalCode,
                latitude = address.location.latitude,
                longitude = address.location.longitude,
                address = address.location.address,
                deliveryInstructions = address.deliveryInstructions
            )
            val response = apiService.updateAddress(address.id, request)
            if (response.isSuccessful && response.body()?.success == true) {
                val addressDto = response.body()?.data
                if (addressDto != null) {
                    val entity = addressDto.toEntity()
                    addressDao.updateAddress(entity)
                    Result.success(entity.toDomainModel())
                } else {
                    Result.failure(Exception("Failed to update address"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun deleteAddress(addressId: String): Result<Unit> {
        return try {
            val response = apiService.deleteAddress(addressId)
            if (response.isSuccessful) {
                val entity = addressDao.getAddressById(addressId)
                entity?.let { addressDao.deleteAddress(it) }
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun setDefaultAddress(addressId: String): Result<Unit> {
        return try {
            val response = apiService.setDefaultAddress(addressId)
            if (response.isSuccessful) {
                val address = addressDao.getAddressById(addressId)
                address?.let {
                    addressDao.clearDefaultAddress(it.userId)
                    addressDao.setDefaultAddress(addressId)
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun UserDto.toEntity(): UserEntity {
        return UserEntity(
            id = id,
            phoneNumber = phoneNumber,
            name = name,
            email = email,
            imageUrl = imageUrl,
            isVerified = isVerified,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
    
    private fun UserEntity.toDomainModel(): User {
        return User(
            id = id,
            phoneNumber = phoneNumber,
            name = name,
            email = email,
            imageUrl = imageUrl,
            isVerified = isVerified,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
    
    private fun AddressDto.toEntity(): AddressEntity {
        return AddressEntity(
            id = id,
            userId = userId,
            title = title,
            fullName = fullName,
            phoneNumber = phoneNumber,
            streetAddress = streetAddress,
            apartment = apartment,
            city = city,
            postalCode = postalCode,
            latitude = location.latitude,
            longitude = location.longitude,
            address = location.address,
            isDefault = isDefault,
            deliveryInstructions = deliveryInstructions
        )
    }
    
    private fun AddressEntity.toDomainModel(): Address {
        return Address(
            id = id,
            userId = userId,
            title = title,
            fullName = fullName,
            phoneNumber = phoneNumber,
            streetAddress = streetAddress,
            apartment = apartment,
            city = city,
            postalCode = postalCode,
            location = Location(latitude, longitude, address),
            isDefault = isDefault,
            deliveryInstructions = deliveryInstructions
        )
    }
}
