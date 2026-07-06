package com.fooddelivery.driver.data

import com.fooddelivery.driver.data.model.User
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.async

/**
 * Repository for handling authentication data sources.
 */
class AuthRepository(
    private val supabaseClient: SupabaseClient
) {

    suspend fun signIn(email: String, password: String): Result<User> {
        return try {
            val response = supabaseClient.signIn(email, password)
            when (response) {
                is Resource.Success -> {
                    val data = response.data
                    // Extract user data from Supabase response
                    val user = User(
                        id = data.getString("id") ?? "",
                        email = data.getString("email") ?? "",
                        fullName = data.getString("user_metadata")?.let { JSONObject(it).optString("full_name", data.getString("email")?.split("@")[0] ?: "User") } ?: data.getString("email")?.split("@")[0] ?: "User",
                        role = data.getString("role") ?: "driver", // Assuming we are signing in as driver
                        phone = data.getString("phone")
                    )
                    Result.success(user)
                }
                is Resource.Error -> Result.exception(Exception(response.message))
                is Resource.Loading -> Result.exception(Exception("Loading"))
            }
        } catch (e: Exception) {
            Result.exception(e)
        }
    }

    // In a real app, we would also have signUp, signOut, refreshToken, etc.
    // For now, we focus on signIn as per the requirement to use Supabase for auth.
}