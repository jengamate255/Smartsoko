package com.smartsoko.customer.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.smartsoko.customer.data.model.Merchant
import com.smartsoko.customer.data.model.Order
import com.smartsoko.customer.data.model.OrderStatus
import com.smartsoko.customer.data.model.OrderItem
import com.smartsoko.customer.data.model.Product
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.Date

data class Customer(
    val id: String = "",
    val ownerId: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val address: String = "",
    val createdAt: Date = Date(),
    val updatedAt: Date = Date()
)

class CustomerRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    fun getCustomerForCurrentUser(): Flow<Customer?> = callbackFlow {
        val userId = currentUser?.uid ?: run {
            trySend(null)
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("customers")
            .whereEqualTo("ownerId", userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val customer = snapshot?.documents?.firstOrNull()?.let { doc ->
                    Customer(
                        id = doc.id,
                        ownerId = doc.getString("ownerId") ?: "",
                        name = doc.getString("name") ?: "",
                        email = doc.getString("email") ?: "",
                        phone = doc.getString("phone") ?: "",
                        address = doc.getString("address") ?: "",
                        createdAt = doc.getDate("createdAt") ?: Date(),
                        updatedAt = doc.getDate("updatedAt") ?: Date()
                    )
                }
                trySend(customer)
            }

        awaitClose { listener.remove() }
    }

    fun getRestaurants(): Flow<List<Merchant>> = callbackFlow {
        val listener = firestore.collection("sellers")
            .orderBy("name", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val restaurants = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        Merchant(
                            id = doc.id,
                            ownerId = doc.getString("ownerId") ?: "",
                            name = doc.getString("name") ?: "",
                            description = doc.getString("description") ?: "",
                            category = doc.getString("category") ?: "",
                            address = doc.getString("address") ?: "",
                            phone = doc.getString("phone") ?: "",
                            email = doc.getString("email") ?: "",
                            imageUrl = doc.getString("imageUrl") ?: "",
                            isOpen = doc.getBoolean("isOpen") ?: true,
                            rating = doc.getDouble("rating") ?: 0.0,
                            reviewCount = doc.getLong("reviewCount")?.toInt() ?: 0,
                            deliveryFee = doc.getDouble("deliveryFee") ?: 0.0,
                            minOrderAmount = doc.getDouble("minOrderAmount") ?: 0.0,
                            deliveryTime = doc.getString("deliveryTime") ?: "30-45 min"
                        )
                    } catch (e: Exception) {
                        null
                    }
                } ?: emptyList()

                trySend(restaurants)
            }

        awaitClose { listener.remove() }
    }

    fun getProductsForRestaurant(merchantId: String): Flow<List<Product>> = callbackFlow {
        val listener = firestore.collection("products")
            .whereEqualTo("merchantId", merchantId)
            .whereEqualTo("available", true)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val products = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        Product(
                            id = doc.id,
                            merchantId = doc.getString("merchantId") ?: "",
                            name = doc.getString("name") ?: "",
                            description = doc.getString("description") ?: "",
                            price = doc.getDouble("price") ?: 0.0,
                            originalPrice = doc.getDouble("originalPrice"),
                            imageUrl = doc.getString("imageUrl") ?: "",
                            category = doc.getString("category") ?: "",
                            available = doc.getBoolean("available") ?: true,
                            featured = doc.getBoolean("featured") ?: false,
                            stockQuantity = doc.getLong("stockQuantity")?.toInt() ?: 0,
                            unit = doc.getString("unit") ?: "item",
                            rating = doc.getDouble("rating"),
                            reviewCount = doc.getLong("reviewCount")?.toInt() ?: 0,
                            createdAt = doc.getDate("createdAt") ?: Date(),
                            updatedAt = doc.getDate("updatedAt") ?: Date()
                        )
                    } catch (e: Exception) {
                        null
                    }
                } ?: emptyList()

                trySend(products)
            }

        awaitClose { listener.remove() }
    }

    fun getOrdersForCustomer(customerId: String): Flow<List<Order>> = callbackFlow {
        val listener = firestore.collection("orders")
            .whereEqualTo("customerId", customerId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val orders = snapshot?.documents?.mapNotNull { doc ->
                    try {
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
                            status = run {
                                val raw = doc.getString("status") ?: "pending"
                                try {
                                    OrderStatus.valueOf(raw.uppercase())
                                } catch (e: IllegalArgumentException) {
                                    OrderStatus.PENDING
                                }
                            },
                            paymentMethod = doc.getString("paymentMethod") ?: "",
                            paymentStatus = doc.getString("paymentStatus") ?: "",
                            deliveryAddress = doc.getString("deliveryAddress") ?: "",
                            deliveryNotes = doc.getString("deliveryNotes") ?: "",
                            driverId = doc.getString("driverId") ?: "",
                            driverName = doc.getString("driverName") ?: "",
                            createdAt = doc.getDate("createdAt") ?: Date(),
                            updatedAt = doc.getDate("updatedAt") ?: Date(),
                            rating = doc.getDouble("rating"),
                            review = doc.getString("review") ?: ""
                        )
                    } catch (e: Exception) {
                        null
                    }
                } ?: emptyList()

                trySend(orders)
            }

        awaitClose { listener.remove() }
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
        address: String
    ): Result<FirebaseUser> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val user = result.user ?: return Result.failure(Exception("Account creation failed"))

            val customerData = hashMapOf(
                "ownerId" to user.uid,
                "name" to name,
                "email" to email,
                "phone" to phone,
                "address" to address,
                "createdAt" to Date(),
                "updatedAt" to Date()
            )

            firestore.collection("customers").add(customerData).await()

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

    suspend fun signOut() {
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

    suspend fun updateCustomerProfile(
        customerId: String,
        name: String,
        phone: String,
        address: String
    ): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "name" to name,
                "phone" to phone,
                "address" to address,
                "updatedAt" to Date()
            )
            firestore.collection("customers").document(customerId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun placeOrder(order: Map<String, Any>): Result<String> {
        return try {
            val docRef = firestore.collection("orders").add(order).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
