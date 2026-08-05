package com.smartsoko.merchant.data.repository

import android.content.Context
import android.net.Uri
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import com.smartsoko.merchant.data.model.Merchant
import com.smartsoko.merchant.data.model.Order
import com.smartsoko.merchant.data.model.OrderStatus
import com.smartsoko.merchant.data.model.Product
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.Date

class MerchantRepository {
    companion object {
        private const val SUPABASE_URL = "https://vonkqyiczeqhuqhahsxm.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8"
    }

    private val firestore = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val storage = FirebaseStorage.getInstance()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    fun getMerchantForCurrentUser(): Flow<Merchant?> = callbackFlow {
        val userId = currentUser?.uid ?: run {
            android.util.Log.w("MerchantRepo", "getMerchantForCurrentUser: currentUser is null, emitting null")
            trySend(null)
            close()
            return@callbackFlow
        }

        android.util.Log.w("MerchantRepo", "getMerchantForCurrentUser: querying sellers where ownerId=$userId")

        val listener = firestore.collection("sellers")
            .whereEqualTo("ownerId", userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("MerchantRepo", "getMerchantForCurrentUser error: ${error.message}")
                    return@addSnapshotListener
                }

                val merchant = snapshot?.documents?.firstOrNull()?.let { doc ->
                    android.util.Log.w("MerchantRepo", "addSnapshotListener: found doc ${doc.id}")
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
                } ?: run {
                    android.util.Log.w("MerchantRepo", "addSnapshotListener: no matching document found")
                    null
                }
                trySend(merchant)
            }

        awaitClose {
            android.util.Log.w("MerchantRepo", "awaitClose: removing listener")
            listener.remove()
        }
    }

    fun getOrdersForMerchant(merchantId: String): Flow<List<Order>> = callbackFlow {
        android.util.Log.w("MerchantRepo", "getOrdersForMerchant: merchantId=$merchantId")
        val listener = firestore.collection("orders")
            .whereEqualTo("sellerId", merchantId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("MerchantRepo", "getOrdersForMerchant error: ${error.message}")
                    return@addSnapshotListener
                }

                val orders = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        val itemsList = doc.get("items") as? List<Map<String, Any>>
                        val parsedItems = itemsList?.mapNotNull { item ->
                            try {
                                com.smartsoko.merchant.data.model.OrderItem(
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

                android.util.Log.w("MerchantRepo", "getOrdersForMerchant: received ${orders.size} orders")
                trySend(orders)
            }

        awaitClose {
            android.util.Log.w("MerchantRepo", "getOrdersForMerchant: awaitClose removing listener")
            listener.remove()
        }
    }

    fun getProductsForMerchant(merchantId: String): Flow<List<Product>> = callbackFlow {
        android.util.Log.w("MerchantRepo", "getProductsForMerchant: merchantId=$merchantId")
        val listener = firestore.collection("products")
            .whereEqualTo("merchantId", merchantId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("MerchantRepo", "getProductsForMerchant error: ${error.message}")
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

                android.util.Log.w("MerchantRepo", "getProductsForMerchant: received ${products.size} products")
                trySend(products)
            }

        awaitClose {
            android.util.Log.w("MerchantRepo", "getProductsForMerchant: awaitClose removing listener")
            listener.remove()
        }
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

    private fun resolveImageUri(imageUri: Uri): Uri {
        return try {
            val context = FirebaseApp.getInstance().applicationContext
            val cacheDir = File(context.cacheDir, "uploads")
            cacheDir.mkdirs()
            val tempFile = File(cacheDir, "upload_${System.currentTimeMillis()}.jpg")
            val copied = context.contentResolver.openInputStream(imageUri)?.use { input ->
                tempFile.outputStream().use { output -> input.copyTo(output) }
                true
            } ?: false
            if (copied) {
                android.util.Log.i("MerchantRepo", "Resolved URI to cache file: ${tempFile.absolutePath}")
                android.net.Uri.fromFile(tempFile)
            } else {
                imageUri
            }
        } catch (e: Exception) {
            android.util.Log.w("MerchantRepo", "Failed to resolve URI, using original: ${e.message}")
            imageUri
        }
    }

    suspend fun uploadProductImage(merchantId: String, imageUri: Uri): Result<String> {
        val resolvedUri = resolveImageUri(imageUri)
        val fileName = "products/${merchantId}/${System.currentTimeMillis()}.jpg"
        val firebaseResult = runCatching {
            val storageRef = storage.reference.child(fileName)
            storageRef.putFile(resolvedUri).await()
            storageRef.downloadUrl.await().toString()
        }
        if (firebaseResult.isSuccess) {
            android.util.Log.i("MerchantRepo", "Firebase upload succeeded")
            return Result.success(firebaseResult.getOrThrow())
        }
        android.util.Log.w("MerchantRepo", "Firebase upload failed: ${firebaseResult.exceptionOrNull()?.message}, falling back to Supabase")
        return uploadToSupabaseStorage(fileName, resolvedUri)
    }

    private suspend fun uploadToSupabaseStorage(fileName: String, imageUri: Uri): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val context = FirebaseApp.getInstance().applicationContext
                val bytes = context.contentResolver.openInputStream(imageUri)?.use { it.readBytes() }
                    ?: return@withContext Result.failure(Exception("Failed to read image"))

                val mimeType = context.contentResolver.getType(imageUri) ?: "image/jpeg"
                val url = URL("$SUPABASE_URL/storage/v1/object/product-images/$fileName")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY)
                conn.setRequestProperty("Content-Type", mimeType)
                conn.outputStream.use { it.write(bytes) }

                val responseCode = conn.responseCode
                if (responseCode in 200..299) {
                    val publicUrl = "$SUPABASE_URL/storage/v1/object/public/product-images/$fileName"
                    android.util.Log.i("MerchantRepo", "Supabase upload succeeded: $publicUrl")
                    Result.success(publicUrl)
                } else {
                    val error = conn.errorStream?.bufferedReader()?.readText() ?: "HTTP $responseCode"
                    android.util.Log.e("MerchantRepo", "Supabase upload failed: $error")
                    Result.failure(Exception("Supabase upload failed: $error"))
                }
            } catch (e: Exception) {
                android.util.Log.e("MerchantRepo", "Supabase upload error: ${e.message}")
                Result.failure(e)
            }
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
