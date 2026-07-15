package com.smartsoko.driver.data.remote.dto

import com.google.gson.annotations.SerializedName

data class OtpRequestDto(
    @SerializedName("phone") val phone: String
)

data class OtpVerifyDto(
    @SerializedName("phone") val phone: String,
    @SerializedName("otp") val otp: String,
    @SerializedName("fcm_token") val fcmToken: String? = null
)

data class AuthResponseDto(
    @SerializedName("token") val token: String,
    @SerializedName("driver_id") val driverId: String,
    @SerializedName("full_name") val fullName: String?,
    @SerializedName("phone") val phone: String,
    @SerializedName("email") val email: String?,
    @SerializedName("is_new") val isNew: Boolean
)

data class DriverProfileDto(
    @SerializedName("full_name") val fullName: String,
    @SerializedName("email") val email: String?,
    @SerializedName("vehicle_type") val vehicleType: String?,
    @SerializedName("vehicle_plate") val vehiclePlate: String?,
    @SerializedName("photo_url") val photoUrl: String?
)
