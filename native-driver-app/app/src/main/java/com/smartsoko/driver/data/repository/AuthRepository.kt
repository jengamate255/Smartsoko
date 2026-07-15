package com.smartsoko.driver.data.repository

import com.smartsoko.driver.data.remote.ApiService
import com.smartsoko.driver.data.remote.dto.*
import com.smartsoko.driver.domain.model.Driver
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService
) {
    suspend fun sendOtp(phone: String): Result<Unit> = runCatching {
        val resp = api.sendOtp(OtpRequestDto(phone))
        if (resp.isSuccessful && resp.body()?.success == true) Unit
        else throw Exception(resp.body()?.message ?: "Failed to send OTP")
    }

    suspend fun verifyOtp(phone: String, otp: String, fcmToken: String?): Result<AuthResponseDto> = runCatching {
        val resp = api.verifyOtp(OtpVerifyDto(phone, otp, fcmToken))
        val body = resp.body()
        if (resp.isSuccessful && body?.success == true && body.data != null) body.data
        else throw Exception(body?.message ?: "Verification failed")
    }

    suspend fun completeProfile(token: String, fullName: String, email: String?, vehicleType: String?, vehiclePlate: String?): Result<AuthResponseDto> = runCatching {
        val resp = api.completeProfile("Bearer $token", DriverProfileDto(fullName, email, vehicleType, vehiclePlate, null))
        val body = resp.body()
        if (resp.isSuccessful && body?.success == true && body.data != null) body.data
        else throw Exception(body?.message ?: "Profile update failed")
    }

    suspend fun getProfile(token: String): Result<Driver> = runCatching {
        val resp = api.getProfile("Bearer $token")
        val body = resp.body()
        if (resp.isSuccessful && body?.success == true && body.data != null) {
            val d = body.data
            Driver(
                id = d.driverId, fullName = d.fullName ?: "", phone = d.phone,
                email = d.email ?: "", photoUrl = null, vehicleType = null,
                vehiclePlate = null, rating = 0.0, totalDeliveries = 0,
                isOnline = false, isVerified = true
            )
        } else throw Exception(body?.message ?: "Failed to get profile")
    }
}
