package com.smartsoko.customer.data.repository

import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import com.smartsoko.customer.BuildConfig
import com.smartsoko.customer.data.local.dao.UserDao
import com.smartsoko.customer.data.local.entity.UserEntity
import com.smartsoko.customer.data.remote.network.ApiClient
import com.smartsoko.customer.domain.model.User
import com.smartsoko.customer.domain.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val userDao: UserDao,
    private val dataStore: DataStore<Preferences>,
    private val apiClient: ApiClient
) : AuthRepository {

    private val gson = Gson()

    private object PreferencesKeys {
        val IS_LOGGED_IN = booleanPreferencesKey("is_logged_in")
        val USER_ID = stringPreferencesKey("user_id")
        val EMAIL = stringPreferencesKey("email")
        val AUTH_TOKEN = stringPreferencesKey("auth_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
    }

    override suspend fun restoreSession() {
        try {
            val prefs = dataStore.data.first()
            val refreshToken = prefs[PreferencesKeys.REFRESH_TOKEN]
            val accessToken = prefs[PreferencesKeys.AUTH_TOKEN]
            if (!refreshToken.isNullOrBlank()) {
                val refreshed = refreshAccessToken(refreshToken)
                if (refreshed != null) {
                    apiClient.updateAuthToken(refreshed.first)
                    dataStore.edit { it ->
                        it[PreferencesKeys.AUTH_TOKEN] = refreshed.first
                        it[PreferencesKeys.REFRESH_TOKEN] = refreshed.second
                    }
                    return
                }
            }
            if (!accessToken.isNullOrBlank()) {
                apiClient.updateAuthToken(accessToken)
            }
        } catch (_: Exception) {}
    }

    private suspend fun refreshAccessToken(refreshToken: String): Pair<String, String>? {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.outputStream.write("""{"refresh_token":"$refreshToken"}""".toByteArray())

                if (connection.responseCode == 200) {
                    val reader = BufferedReader(InputStreamReader(connection.inputStream))
                    val response = reader.readText()
                    reader.close()
                    connection.disconnect()
                    val parsed = gson.fromJson(response, SupabaseAuthResponse::class.java)
                    parsed.access_token to parsed.refresh_token
                } else {
                    connection.disconnect()
                    null
                }
            } catch (e: Exception) {
                Log.w("AuthRepository", "Token refresh failed", e)
                null
            }
        }
    }

    override suspend fun login(email: String, password: String): Result<User> {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=password")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = 15000
                connection.readTimeout = 15000

                val requestBody = """{"email":"$email","password":"$password"}"""
                connection.outputStream.write(requestBody.toByteArray())

                val responseCode = connection.responseCode
            if (responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()

                val supabaseResponse = gson.fromJson(response, SupabaseAuthResponse::class.java)
                val accessToken = supabaseResponse.access_token
                val supaUser = supabaseResponse.user

                apiClient.updateAuthToken(accessToken)

                val user = User(
                    id = supaUser.id,
                    phoneNumber = "",
                    name = supaUser.user_metadata?.full_name ?: supaUser.email?.substringBefore("@") ?: "",
                    email = supaUser.email ?: email,
                    imageUrl = null,
                    isVerified = true,
                    createdAt = supaUser.created_at?.let { parseIsoTimestamp(it) } ?: System.currentTimeMillis(),
                    updatedAt = System.currentTimeMillis()
                )

                userDao.insertUser(UserEntity(
                    id = user.id,
                    phoneNumber = user.phoneNumber,
                    name = user.name,
                    email = user.email,
                    imageUrl = user.imageUrl,
                    isVerified = user.isVerified,
                    createdAt = user.createdAt,
                    updatedAt = user.updatedAt
                ))

                dataStore.edit { prefs ->
                    prefs[PreferencesKeys.IS_LOGGED_IN] = true
                    prefs[PreferencesKeys.USER_ID] = user.id
                    prefs[PreferencesKeys.EMAIL] = user.email ?: email
                    prefs[PreferencesKeys.AUTH_TOKEN] = accessToken
                    prefs[PreferencesKeys.REFRESH_TOKEN] = supabaseResponse.refresh_token
                }

                Result.success(user)
            } else {
                val errorReader = BufferedReader(InputStreamReader(connection.errorStream))
                val errorBody = errorReader.readText()
                errorReader.close()
                Result.failure(Exception(errorBody))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    }

    override suspend fun signup(email: String, password: String): Result<User> {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("${BuildConfig.SUPABASE_URL}/auth/v1/signup")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = 15000
                connection.readTimeout = 15000

                val requestBody = """{"email":"$email","password":"$password"}"""
                connection.outputStream.write(requestBody.toByteArray())

                val responseCode = connection.responseCode
                if (responseCode in 200..299) {
                    val reader = BufferedReader(InputStreamReader(connection.inputStream))
                    val response = reader.readText()
                    reader.close()

                    val supabaseResponse = gson.fromJson(response, SupabaseAuthResponse::class.java)
                    val accessToken = supabaseResponse.access_token
                    val supaUser = supabaseResponse.user

                apiClient.updateAuthToken(accessToken)

                    val user = User(
                        id = supaUser.id,
                        phoneNumber = "",
                        name = supaUser.email?.substringBefore("@") ?: "",
                        email = supaUser.email ?: email,
                        imageUrl = null,
                        isVerified = false,
                        createdAt = supaUser.created_at?.let { parseIsoTimestamp(it) } ?: System.currentTimeMillis(),
                        updatedAt = System.currentTimeMillis()
                    )

                    userDao.insertUser(UserEntity(
                        id = user.id,
                        phoneNumber = user.phoneNumber,
                        name = user.name,
                        email = user.email,
                        imageUrl = user.imageUrl,
                        isVerified = user.isVerified,
                        createdAt = user.createdAt,
                        updatedAt = user.updatedAt
                    ))

                dataStore.edit { prefs ->
                    prefs[PreferencesKeys.IS_LOGGED_IN] = true
                    prefs[PreferencesKeys.USER_ID] = user.id
                    prefs[PreferencesKeys.EMAIL] = user.email ?: email
                    prefs[PreferencesKeys.AUTH_TOKEN] = accessToken
                    prefs[PreferencesKeys.REFRESH_TOKEN] = supabaseResponse.refresh_token
                }

                    Result.success(user)
                } else {
                    val errorReader = BufferedReader(InputStreamReader(connection.errorStream))
                    val errorBody = errorReader.readText()
                    errorReader.close()
                    Result.failure(Exception(errorBody))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    override suspend fun signInWithGoogle(idToken: String): Result<User> {
        return withContext(Dispatchers.IO) {
            try {
                val credential = com.google.firebase.auth.GoogleAuthProvider.getCredential(idToken, null)
                val authResult = com.google.firebase.auth.FirebaseAuth.getInstance()
                    .signInWithCredential(credential)
                    .await()
                val firebaseUser = authResult.user ?: return@withContext Result.failure(Exception("Google sign-in failed"))

                val tokenResult = firebaseUser.getIdToken(false).await() ?: return@withContext Result.failure(Exception("Failed to get Firebase ID token"))

                apiClient.updateAuthToken(tokenResult.token)

                val user = User(
                    id = firebaseUser.uid,
                    phoneNumber = firebaseUser.phoneNumber ?: "",
                    name = firebaseUser.displayName ?: firebaseUser.email?.substringBefore("@") ?: "",
                    email = firebaseUser.email ?: "",
                    imageUrl = firebaseUser.photoUrl?.toString(),
                    isVerified = firebaseUser.isEmailVerified,
                    createdAt = System.currentTimeMillis(),
                    updatedAt = System.currentTimeMillis()
                )

                userDao.insertUser(UserEntity(
                    id = user.id,
                    phoneNumber = user.phoneNumber,
                    name = user.name,
                    email = user.email,
                    imageUrl = user.imageUrl,
                    isVerified = user.isVerified,
                    createdAt = user.createdAt,
                    updatedAt = user.updatedAt
                ))

                dataStore.edit { prefs ->
                    prefs[PreferencesKeys.IS_LOGGED_IN] = true
                    prefs[PreferencesKeys.USER_ID] = user.id
                    prefs[PreferencesKeys.EMAIL] = user.email ?: ""
                    prefs[PreferencesKeys.AUTH_TOKEN] = tokenResult.token ?: ""
                }

                Result.success(user)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    override suspend fun logout(): Result<Unit> {
        return try {
            apiClient.updateAuthToken(null)
            dataStore.edit { preferences ->
                preferences[PreferencesKeys.IS_LOGGED_IN] = false
                preferences[PreferencesKeys.USER_ID] = ""
                preferences[PreferencesKeys.EMAIL] = ""
                preferences[PreferencesKeys.AUTH_TOKEN] = ""
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getCurrentUser(): Result<User?> {
        return try {
            val userId = dataStore.data.map { it[PreferencesKeys.USER_ID] }.first()
            if (userId.isNullOrEmpty()) {
                Result.success(null)
            } else {
                val userEntity = userDao.getUserById(userId)
                if (userEntity != null) {
                    Result.success(userEntity.toDomainModel())
                } else {
                    Result.success(null)
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun isLoggedIn(): Flow<Boolean> {
        return dataStore.data.map { preferences ->
            preferences[PreferencesKeys.IS_LOGGED_IN] ?: false
        }
    }

    private var cachedUserId: String? = null

    override fun getCurrentUserId(): String? {
        if (cachedUserId == null) {
            cachedUserId = try {
                runBlocking { dataStore.data.map { it[PreferencesKeys.USER_ID] }.first() }
                    ?.takeIf { it.isNotEmpty() }
            } catch (_: Exception) {
                null
            }
        }
        return cachedUserId
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

    private fun parseIsoTimestamp(iso: String): Long {
        return try {
            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.parse(iso)?.time ?: System.currentTimeMillis()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }

    data class SupabaseAuthResponse(
        @SerializedName("access_token") val access_token: String,
        @SerializedName("token_type") val token_type: String,
        @SerializedName("expires_in") val expires_in: Int,
        @SerializedName("refresh_token") val refresh_token: String,
        @SerializedName("user") val user: SupabaseUser
    )

    data class SupabaseUser(
        @SerializedName("id") val id: String,
        @SerializedName("email") val email: String?,
        @SerializedName("user_metadata") val user_metadata: SupabaseUserMetadata?,
        @SerializedName("created_at") val created_at: String?
    )

    data class SupabaseUserMetadata(
        @SerializedName("full_name") val full_name: String?
    )
}
