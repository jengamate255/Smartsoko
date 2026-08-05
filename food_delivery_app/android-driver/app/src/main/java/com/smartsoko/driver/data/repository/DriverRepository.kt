package com.smartsoko.driver.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.smartsoko.driver.data.model.Driver
import com.smartsoko.driver.data.model.DriverStatus
import com.smartsoko.driver.data.model.Order
import com.smartsoko.driver.data.model.OrderItem
import com.smartsoko.driver.data.model.OrderStatus
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.Date

class DriverRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    fun getDriverForCurrentUser(): Flow<Driver?> = callbackFlow {
        val userId = currentUser?.uid ?: run {
            trySend(null)
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("drivers")
            .whereEqualTo("ownerId", userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val driver = snapshot?.documents?.firstOrNull()?.let { doc ->
                    Driver(
                        id = doc.id,
                        ownerId = doc.getString("ownerId") ?: "",
                        name = doc.getString("name") ?: "",
                        email = doc.getString("email") ?: "",
                        phone = doc.getString("phone") ?: "",
                        vehicleType = doc.getString("vehicleType") ?: "",
                        vehiclePlate = doc.getString("vehiclePlate") ?: "",
                        isOnline = doc.getBoolean("isOnline") ?: false,
                        status = try {
                            DriverStatus.valueOf(
                                doc.getString("status") ?: "OFFLINE"
                            )
                        } catch (e: IllegalArgumentException) {
                            DriverStatus.OFFLINE
                        },
                        rating = doc.getDouble("rating") ?: 0.0,
                        reviewCount = doc.getLong("reviewCount")?.toInt() ?: 0,
                        currentLatitude = doc.getDouble("currentLatitude") ?: 0.0,
                        currentLongitude = doc.getDouble("currentLongitude") ?: 0.0,
                        createdAt = doc.getDate("createdAt") ?: Date(),
                        updatedAt = doc.getDate("updatedAt") ?: Date()
                    )
                }
                trySend(driver)
            }

        awaitClose { listener.remove() }
    }

    fun getAvailableOrders(): Flow<List<Order>> = callbackFlow {
        val listener = firestore.collection("orders")
            .whereEqualTo("status", "pending")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val orders = snapshot?.documents?.mapNotNull { doc ->
                    parseOrder(doc)
                } ?: emptyList()

                val filtered = orders.filter {
                    it.driverId.isBlank()
                }

                trySend(filtered)
            }

        awaitClose { listener.remove() }
    }

    fun getAssignedOrders(driverId: String): Flow<List<Order>> = callbackFlow {
        val listener = firestore.collection("orders")
            .whereEqualTo("driverId", driverId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val orders = snapshot?.documents?.mapNotNull { doc ->
                    parseOrder(doc)
                } ?: emptyList()

                trySend(orders)
            }

        awaitClose { listener.remove() }
    }

    private fun parseOrder(doc: com.google.firebase.firestore.DocumentSnapshot): Order? {
        return try {
            val itemsList = doc.get("items") as? List<Map<String, Any>>
            val parsedItems = itemsList?.mapNotNull { item ->
                try {
                    OrderItem(
                        productId = item["productId"] as? String ?: "",
                        name = item["name"] as? String ?: "",
                        quantity = (item["quantity"] as? Long)?.toInt() ?: 1,
                        price = (item["price"] as? Number)?.toDouble() ?: 0.0,
                        imageUrl = item["imageUrl"] as? String ?: ""
                    )
                } catch (e: Exception) { null }
            } ?: emptyList()

            Order(
                id = doc.id,
                customerId = doc.getString("customerId") ?: "",
                customerName = doc.getString("customerName") ?: "",
                customerPhone = doc.getString("customerPhone") ?: "",
                sellerId = doc.getString("sellerId") ?: "",
                sellerName = doc.getString("sellerName") ?: "",
                items = parsedItems,
                totalAmount = doc.getDouble("totalAmount") ?: 0.0,
                deliveryFee = doc.getDouble("deliveryFee") ?: 0.0,
                status = doc.getString("status")?.let { status ->
                    try {
                        OrderStatus.valueOf(status.uppercase())
                    } catch (e: IllegalArgumentException) {
                        OrderStatus.PENDING
                    }
                } ?: OrderStatus.PENDING,
                paymentMethod = doc.getString("paymentMethod") ?: "",
                paymentStatus = doc.getString("paymentStatus") ?: "",
                deliveryAddress = doc.getString("deliveryAddress") ?: "",
                deliveryNotes = doc.getString("deliveryNotes") ?: "",
                driverId = doc.getString("driverId") ?: "",
                driverName = doc.getString("driverName") ?: "",
                createdAt = doc.getDate("createdAt") ?: Date(),
                updatedAt = doc.getDate("updatedAt") ?: Date(),
                acceptedAt = doc.getDate("acceptedAt"),
                readyAt = doc.getDate("readyAt"),
                pickedUpAt = doc.getDate("pickedUpAt"),
                deliveredAt = doc.getDate("deliveredAt"),
                rating = doc.getDouble("rating"),
                review = doc.getString("review") ?: ""
            )
        } catch (e: Exception) {
            null
        }
    }

    suspend fun signIn(email: String, password: String): Result<FirebaseUser> {
        return try {
            val result = auth.signInWithEmailAndPassword(email, password).await()
            result.user?.let {
                Result.success(it)
            } ?: Result.failure(Exception("Authentication failed"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signUp(
        email: String,
        password: String,
        name: String,
        phone: String,
        vehicleType: String,
        vehiclePlate: String
    ): Result<FirebaseUser> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val user = result.user ?: return Result.failure(Exception("Account creation failed"))

            val driverData = hashMapOf(
                "ownerId" to user.uid,
                "name" to name,
                "email" to email,
                "phone" to phone,
                "vehicleType" to vehicleType,
                "vehiclePlate" to vehiclePlate,
                "isOnline" to false,
                "status" to DriverStatus.OFFLINE.name,
                "rating" to 0.0,
                "reviewCount" to 0,
                "currentLatitude" to 0.0,
                "currentLongitude" to 0.0,
                "createdAt" to Date(),
                "updatedAt" to Date()
            )

            firestore.collection("drivers").add(driverData).await()

            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signInWithGoogle(idToken: String): Result<FirebaseUser> {
        return try {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val result = auth.signInWithCredential(credential).await()
            result.user?.let {
                Result.success(it)
            } ?: Result.failure(Exception("Authentication failed"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun signOut() {
        auth.signOut()
    }

    suspend fun resetPassword(email: String): Result<Unit> {
        return try {
            auth.sendPasswordResetEmail(email).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateDriverStatus(
        driverId: String,
        isOnline: Boolean,
        status: DriverStatus
    ): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "isOnline" to isOnline,
                "status" to status.name,
                "updatedAt" to Date()
            )
            firestore.collection("drivers").document(driverId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun acceptOrder(
        orderId: String,
        driverId: String,
        driverName: String
    ): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "status" to "accepted",
                "driverId" to driverId,
                "driverName" to driverName,
                "acceptedAt" to Date(),
                "updatedAt" to Date()
            )
            firestore.collection("orders").document(orderId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markPickedUp(orderId: String): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "status" to "pickedup",
                "pickedUpAt" to Date(),
                "updatedAt" to Date()
            )
            firestore.collection("orders").document(orderId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markDelivered(orderId: String): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "status" to "delivered",
                "deliveredAt" to Date(),
                "updatedAt" to Date()
            )
            firestore.collection("orders").document(orderId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateDriverLocation(
        driverId: String,
        latitude: Double,
        longitude: Double
    ): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "currentLatitude" to latitude,
                "currentLongitude" to longitude,
                "updatedAt" to Date()
            )
            firestore.collection("drivers").document(driverId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
