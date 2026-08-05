package com.fooddelivery.driver.data

import com.fooddelivery.driver.data.model.User
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class AuthRepository {
    private val auth: FirebaseAuth = Firebase.auth

    val currentUser: FirebaseUser? get() = auth.currentUser

    val isSignedIn: Boolean get() = auth.currentUser != null

    val authStateChanges: Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser)
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    suspend fun signIn(email: String, password: String): Result<User> {
        return try {
            val result = auth.signInWithEmailAndPassword(email, password).await()
            val fbUser = result.user ?: throw Exception("Sign in failed")
            Result.success(fbUser.toAppUser())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signUp(email: String, password: String, name: String): Result<User> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val fbUser = result.user ?: throw Exception("Sign up failed")
            fbUser.updateProfile(com.google.firebase.auth.UserProfileChangeRequest.Builder()
                .setDisplayName(name)
                .build()
            ).await()
            Result.success(fbUser.toAppUser())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getFirebaseToken(): String {
        return auth.currentUser?.getIdToken(true)?.await()?.token
            ?: throw Exception("Not authenticated")
    }

    suspend fun signOut() {
        auth.signOut()
    }

    private fun FirebaseUser.toAppUser(): User {
        return User(
            id = uid,
            email = email ?: "",
            fullName = displayName ?: email?.split("@")?.firstOrNull() ?: "User",
            role = "driver",
            phone = phoneNumber ?: ""
        )
    }
}
