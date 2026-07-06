package com.fooddelivery.merchant1.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import com.fooddelivery.merchant1.data.model.Merchant
import com.fooddelivery.merchant1.data.model.Order
import com.fooddelivery.merchant1.data.model.OrderStatus
import com.fooddelivery.merchant1.data.model.Product
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.Date

class MerchantRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val storage = FirebaseStorage.getInstance()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    fun getMerchantForCurrentUser(): Flow<Merchant?> = callbackFlow {
        val userId = currentUser?.uid ?: run {
            trySend(null)
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("sellers")
            .whereEqualTo("ownerId", userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val merchant = snapshot?.documents?.firstOrNull()?.let { doc ->
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
                }
                trySend(merchant)
            }

        awaitClose { listener.remove() }
    }

    fun getOrdersForMerchant(merchantId: String): Flow<List<Order>> = callbackFlow {
        val listener = firestore.collection("orders")
            .whereEqualTo("sellerId", merchantId)
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
                                com.fooddelivery.merchant1.data.model.OrderItem(
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

    fun getProductsForMerchant(merchantId: String): Flow<List<Product>> = callbackFlow {
        val listener = firestore.collection("products")
            .whereEqualTo("merchantId", merchantId)
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

    suspend fun updateOrderStatus(orderId: String, status: OrderStatus): Result<Unit> {
        return try {
            val updates = hashMapOf(
                "status" to status.name.lowercase(),
                "updatedAt" to Date()
            )

            when (status) {
                OrderStatus.ACCEPTED -> updates["acceptedAt"] = Date()
                OrderStatus.READY -> updates["readyAt"] = Date()
                OrderStatus.DELIVERED -> updates["deliveredAt"] = Date()
                else -> {}
            }

            firestore.collection("orders").document(orderId)
                .update(updates as Map<String, Any>)
                .await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateProductAvailability(productId: String, available: Boolean): Result<Unit> {
        return try {
            firestore.collection("products").document(productId)
                .update(
                    "available", available,
                    "updatedAt", Date()
                )
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteProduct(productId: String): Result<Unit> {
        return try {
            firestore.collection("products").document(productId)
                .delete()
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
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
        address: String,
        description: String,
        category: String,
        deliveryFee: Double,
        minOrderAmount: Double,
        deliveryTime: String
    ): Result<FirebaseUser> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val user = result.user ?: return Result.failure(Exception("Account creation failed"))

            val merchantData = hashMapOf(
                "ownerId" to user.uid,
                "name" to name,
                "email" to email,
                "phone" to phone,
                "address" to address,
                "description" to description,
                "category" to category,
                "imageUrl" to "",
                "isOpen" to true,
                "rating" to 0.0,
                "reviewCount" to 0,
                "deliveryFee" to deliveryFee,
                "minOrderAmount" to minOrderAmount,
                "deliveryTime" to deliveryTime,
                "createdAt" to Date(),
                "updatedAt" to Date()
            )

            firestore.collection("sellers").add(merchantData).await()

            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addProduct(product: Product): Result<String> {
        return try {
            val productMap = hashMapOf(
                "merchantId" to product.merchantId,
                "name" to product.name,
                "description" to product.description,
                "price" to product.price,
                "originalPrice" to product.originalPrice,
                "imageUrl" to product.imageUrl,
                "category" to product.category,
                "available" to product.available,
                "featured" to product.featured,
                "stockQuantity" to product.stockQuantity,
                "unit" to product.unit,
                "createdAt" to Date(),
                "updatedAt" to Date()
            )

            val docRef = firestore.collection("products").add(productMap).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadProductImage(merchantId: String, imageUri: android.net.Uri): Result<String> {
        return try {
            val fileName = "products/${merchantId}/${System.currentTimeMillis()}.jpg"
            val storageRef = storage.reference.child(fileName)
            storageRef.putFile(imageUri).await()
            val downloadUrl = storageRef.downloadUrl.await()
            Result.success(downloadUrl.toString())
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

    suspend fun updateStoreOpenStatus(merchantId: String, isOpen: Boolean): Result<Unit> {
        return try {
            firestore.collection("sellers").document(merchantId)
                .update("isOpen", isOpen, "updatedAt", Date())
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateMerchantProfile(
        merchantId: String,
        name: String,
        phone: String,
        address: String,
        description: String,
        deliveryFee: Double,
        minOrderAmount: Double,
        deliveryTime: String
    ): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "name" to name,
                "phone" to phone,
                "address" to address,
                "description" to description,
                "deliveryFee" to deliveryFee,
                "minOrderAmount" to minOrderAmount,
                "deliveryTime" to deliveryTime,
                "updatedAt" to Date()
            )
            firestore.collection("sellers").document(merchantId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateProduct(
        productId: String,
        name: String,
        description: String,
        price: Double,
        originalPrice: Double?,
        category: String,
        unit: String,
        stockQuantity: Int,
        featured: Boolean,
        imageUri: android.net.Uri?
    ): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "name" to name,
                "description" to description,
                "price" to price,
                "category" to category,
                "unit" to unit,
                "stockQuantity" to stockQuantity,
                "featured" to featured,
                "updatedAt" to Date()
            )
            if (originalPrice != null) updates["originalPrice"] = originalPrice
            if (imageUri != null) {
                val product = firestore.collection("products").document(productId).get().await()
                val merchantId = product.getString("merchantId") ?: ""
                uploadProductImage(merchantId, imageUri)
                    .onSuccess { url -> updates["imageUrl"] = url }
                    .onFailure { return Result.failure(it) }
            }
            firestore.collection("products").document(productId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
