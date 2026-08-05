package com.smartsoko.customer.domain.repository

import com.smartsoko.customer.domain.model.User
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<User>
    suspend fun signup(email: String, password: String): Result<User>
    suspend fun signInWithGoogle(idToken: String): Result<User>
    suspend fun logout(): Result<Unit>
    suspend fun getCurrentUser(): Result<User?>
    suspend fun restoreSession()
    fun isLoggedIn(): Flow<Boolean>
    fun getCurrentUserId(): String?
}
