package com.smartsoko.driver.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Transaction
import com.smartsoko.driver.data.model.Driver
import com.smartsoko.driver.data.model.DriverStatus
import com.smartsoko.driver.data.model.Order
import com.smartsoko.driver.data.model.OrderItem
import com.smartsoko.driver.data.model.OrderStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.Date

class DriverRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    private fun driverDoc(uid: String): DocumentReference =
        firestore.collection("drivers").document(uid)

    // Canonical driver doc lives at drivers/{uid} (same as the web driver app).
    // If it doesn't exist (e.g. after Google sign-in), auto-create one.
    fun getDriverForCurrentUser(): Flow<Driver?> = callbackFlow {
        val userId = currentUser?.uid ?: run {
            trySend(null)
            close()
            return@callbackFlow
        }

        val ref = driverDoc(userId)
        ref.get().addOnSuccessListener { existing ->
            if (!existing.exists()) {
                val now = FieldValue.serverTimestamp()
                val data = mapOf(
                    "name" to (currentUser?.displayName ?: "Driver"),
                    "email" to (currentUser?.email ?: ""),
                    "phone" to (currentUser?.phoneNumber ?: ""),
                    "ownerId" to userId,
                    "status" to "OFFLINE",
                    "isOnline" to false,
                    "available" to true,
                    "rating" to 0.0,
                    "reviewCount" to 0,
                    "createdAt" to now,
                    "updatedAt" to now
                )
                ref.set(data)
            }
        }

        val listener = ref.addSnapshotListener { doc, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val driver = doc?.takeIf { it.exists() }?.let { d ->
                    Driver(
                        id = d.id,
                        ownerId = d.getString("ownerId") ?: "",
                        name = d.getString("name") ?: "",
                        email = d.getString("email") ?: "",
                        phone = d.getString("phone") ?: "",
                        vehicleType = d.getString("vehicleType") ?: "",
                        vehiclePlate = d.getString("vehiclePlate") ?: "",
                        isOnline = d.getBoolean("isOnline") ?: false,
                        status = parseDriverStatus(d.getString("status")),
                        rating = d.getDouble("rating") ?: 0.0,
                        reviewCount = d.getLong("reviewCount")?.toInt() ?: 0,
                        currentLatitude = d.getDouble("currentLatitude")
                            ?: d.getDouble("latitude") ?: 0.0,
                        currentLongitude = d.getDouble("currentLongitude")
                            ?: d.getDouble("longitude") ?: 0.0,
                        createdAt = d.getDate("createdAt") ?: Date(),
                        updatedAt = d.getDate("updatedAt") ?: Date()
                    )
                }
                trySend(driver)
            }

        awaitClose { listener.remove() }
    }

    private fun parseDriverStatus(raw: String?): DriverStatus = try {
        DriverStatus.valueOf((raw ?: "OFFLINE").uppercase())
    } catch (e: IllegalArgumentException) {
        DriverStatus.OFFLINE
    }

    // Use the server API for available orders — it has dual-db (Firestore
    // + Supabase fallback) so it works even when Firestore quota is hit.
    // Polls every 15s in a callbackFlow so collectors get live updates.
    fun getAvailableOrders(): Flow<List<Order>> = callbackFlow {
        val job = CoroutineScope(Dispatchers.IO).launch {
            while (true) {
                try {
                    val token = auth.currentUser?.getIdToken(false)?.await()
                    val idToken = token?.token ?: ""
                    val url = java.net.URL("http://192.168.1.24:3000/api/driver/available-orders")
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.setRequestProperty("Authorization", "Bearer $idToken")
                    conn.connectTimeout = 5000
                    conn.readTimeout = 5000
                    if (conn.responseCode == 200) {
                        val body = conn.inputStream.bufferedReader().readText()
                        val json = org.json.JSONObject(body)
                        val data = json.optJSONArray("data") ?: json.optJSONArray("orders") ?: org.json.JSONArray()
                        val orders = mutableListOf<Order>()
                        for (i in 0 until data.length()) {
                            val item = data.getJSONObject(i)
                            val o = parseOrderFromJson(item)
                            if (o != null && o.driverId.isBlank()) orders.add(o)
                        }
                        trySend(orders.sortedByDescending { it.createdAt })
                    }
                } catch (_: Exception) {
                    try {
                        val snap = firestore.collection("orders")
                            .whereEqualTo("status", "ready_for_delivery")
                            .get().await()
                        val orders = snap.documents.mapNotNull { parseOrder(it) }
                            .filter { it.driverId.isBlank() }
                            .sortedByDescending { it.createdAt }
                        trySend(orders)
                    } catch (_: Exception) {}
                }
                delay(15_000)
            }
        }
        awaitClose { job.cancel() }
    }

    fun getAssignedOrders(driverId: String): Flow<List<Order>> = callbackFlow {
        val listener = firestore.collection("orders")
            .whereEqualTo("driverId", driverId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val orders = snapshot?.documents?.mapNotNull { parseOrder(it) }
                    ?.sortedByDescending { it.updatedAt }
                    ?: emptyList()

                trySend(orders)
            }

        awaitClose { listener.remove() }
    }

    private fun parseOrder(doc: DocumentSnapshot): Order? {
        return try {
            val itemsList = doc.get("items") as? List<Map<String, Any>>
            val parsedItems = itemsList?.mapNotNull { item ->
                try {
                    OrderItem(
                        productId = item["productId"] as? String
                            ?: item["id"] as? String ?: "",
                        name = item["name"] as? String ?: "",
                        quantity = (item["quantity"] as? Long)?.toInt()
                            ?: (item["quantity"] as? Number)?.toInt() ?: 1,
                        price = (item["price"] as? Number)?.toDouble() ?: 0.0,
                        imageUrl = item["imageUrl"] as? String ?: ""
                    )
                } catch (e: Exception) { null }
            } ?: emptyList()

            Order(
                id = doc.id,
                customerId = doc.getString("customerId") ?: "",
                customerName = doc.getString("customerName") ?: "",
                customerPhone = doc.getString("customerPhone")
                    ?: doc.getString("contactPhone") ?: "",
                sellerId = doc.getString("sellerId")
                    ?: doc.getString("merchantId") ?: "",
                sellerName = doc.getString("sellerName") ?: "",
                items = parsedItems,
                totalAmount = doc.getDouble("total")
                    ?: doc.getDouble("totalAmount") ?: 0.0,
                deliveryFee = doc.getDouble("deliveryFee") ?: 0.0,
                status = parseOrderStatus(doc.getString("status")),
                paymentMethod = doc.getString("paymentMethod") ?: "",
                paymentStatus = doc.getString("paymentStatus") ?: "",
                deliveryAddress = doc.getString("deliveryAddress")
                    ?: doc.getString("customerAddress")
                    ?: doc.getString("delivery_address") ?: "",
                deliveryNotes = doc.getString("deliveryNotes")
                    ?: doc.getString("special_instructions") ?: "",
                deliveryLatitude = doc.getDouble("deliveryLatitude")
                    ?: doc.getDouble("deliveryLat")
                    ?: doc.getDouble("delivery_latitude"),
                deliveryLongitude = doc.getDouble("deliveryLongitude")
                    ?: doc.getDouble("deliveryLng")
                    ?: doc.getDouble("delivery_longitude"),
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

    private fun parseOrderFromJson(item: org.json.JSONObject): Order? {
        return try {
            val itemsArr = item.optJSONArray("items")
            val parsedItems = mutableListOf<OrderItem>()
            if (itemsArr != null) {
                for (j in 0 until itemsArr.length()) {
                    val it = itemsArr.getJSONObject(j)
                    parsedItems.add(OrderItem(
                        productId = it.optString("productId", it.optString("id", "")),
                        name = it.optString("name", ""),
                        quantity = it.optInt("quantity", 1),
                        price = it.optDouble("price", 0.0),
                        imageUrl = it.optString("imageUrl", "")
                    ))
                }
            }
            Order(
                id = item.optString("id", ""),
                customerId = item.optString("customerId", ""),
                customerName = item.optString("customerName", ""),
                customerPhone = item.optString("customerPhone", item.optString("contactPhone", "")),
                sellerId = item.optString("sellerId", item.optString("merchantId", "")),
                sellerName = item.optString("sellerName", ""),
                items = parsedItems,
                totalAmount = item.optDouble("total", item.optDouble("totalAmount", 0.0)),
                deliveryFee = item.optDouble("deliveryFee", 0.0),
                status = parseOrderStatus(item.optString("status", "")),
                paymentMethod = item.optString("paymentMethod", ""),
                paymentStatus = item.optString("paymentStatus", ""),
                deliveryAddress = item.optString("deliveryAddress", item.optString("customerAddress", "")),
                deliveryNotes = item.optString("deliveryNotes", item.optString("special_instructions", "")),
                deliveryLatitude = if (item.has("deliveryLatitude") && !item.isNull("deliveryLatitude")) item.getDouble("deliveryLatitude")
                    else if (item.has("deliveryLat") && !item.isNull("deliveryLat")) item.getDouble("deliveryLat")
                    else if (item.has("delivery_latitude") && !item.isNull("delivery_latitude")) item.getDouble("delivery_latitude") else null,
                deliveryLongitude = if (item.has("deliveryLongitude") && !item.isNull("deliveryLongitude")) item.getDouble("deliveryLongitude")
                    else if (item.has("deliveryLng") && !item.isNull("deliveryLng")) item.getDouble("deliveryLng")
                    else if (item.has("delivery_longitude") && !item.isNull("delivery_longitude")) item.getDouble("delivery_longitude") else null,
                driverId = item.optString("driverId", ""),
                driverName = item.optString("driverName", ""),
                createdAt = parseDate(item, "createdAt") ?: Date(),
                updatedAt = parseDate(item, "updatedAt") ?: Date(),
                acceptedAt = parseDate(item, "acceptedAt"),
                readyAt = parseDate(item, "readyAt"),
                pickedUpAt = parseDate(item, "pickedUpAt"),
                deliveredAt = parseDate(item, "deliveredAt"),
                rating = if (item.has("rating") && !item.isNull("rating")) item.getDouble("rating") else null,
                review = item.optString("review", "")
            )
        } catch (e: Exception) { null }
    }

    private fun parseDate(item: org.json.JSONObject, key: String): Date? {
        return try {
            val v = item.opt(key) ?: return null
            when (v) {
                is String -> {
                    val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                    sdf.parse(v.replace("Z", "").take(19)) ?: Date()
                }
                is Long -> Date(v)
                is org.json.JSONObject -> {
                    val secs = v.optLong("_seconds", 0)
                    Date(secs * 1000)
                }
                is Number -> Date(v.toLong())
                else -> null
            }
        } catch (e: Exception) { null }
    }

    private fun parseOrderStatus(raw: String?): OrderStatus = when (raw?.lowercase()) {
        "ready_for_delivery" -> OrderStatus.READY
        "assigned", "accepted" -> OrderStatus.ACCEPTED
        "picked_up", "pickedup" -> OrderStatus.PICKEDUP
        "in_transit" -> OrderStatus.PICKEDUP
        "delivered" -> OrderStatus.DELIVERED
        "completed" -> OrderStatus.COMPLETED
        "cancelled" -> OrderStatus.CANCELLED
        "rejected" -> OrderStatus.REJECTED
        "pending" -> OrderStatus.PENDING
        else -> OrderStatus.PENDING
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

            val driverData = hashMapOf<String, Any>(
                "ownerId" to user.uid,
                "name" to name,
                "email" to email,
                "phone" to phone,
                "vehicleType" to vehicleType,
                "vehiclePlate" to vehiclePlate,
                "isOnline" to false,
                "status" to DriverStatus.OFFLINE.name.lowercase(),
                "available" to false,
                "rating" to 0.0,
                "reviewCount" to 0,
                "totalDeliveries" to 0,
                "currentLatitude" to 0.0,
                "currentLongitude" to 0.0,
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )

            // drivers/{uid} is the canonical doc (rules: create requires ownerId == uid).
            driverDoc(user.uid).set(driverData).await()

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

    // Rules allow owner updates (ownerId == uid) or whitelisted availability
    // fields. The web app also flips 'available' with the toggle.
    suspend fun updateDriverStatus(
        driverId: String,
        isOnline: Boolean,
        status: DriverStatus
    ): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "isOnline" to isOnline,
                "status" to status.name.lowercase(),
                "available" to isOnline,
                "updatedAt" to FieldValue.serverTimestamp()
            )
            driverDoc(driverId).update(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Update editable profile fields. Rules allow the owner to update
    // their own drivers/{uid} doc (ownerId == uid).
    suspend fun updateDriverProfile(
        driverId: String,
        name: String,
        phone: String,
        vehicleType: String,
        vehiclePlate: String
    ): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "name" to name,
                "phone" to phone,
                "vehicleType" to vehicleType,
                "vehiclePlate" to vehiclePlate,
                "updatedAt" to FieldValue.serverTimestamp()
            )
            driverDoc(driverId).update(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Race-safe claim: the transaction fails if another driver took the order.
    // Rules require the claim to set status 'assigned' with this driver's id.
    suspend fun acceptOrder(
        orderId: String,
        driverId: String,
        driverName: String
    ): Result<Unit> {
        return try {
            firestore.runTransaction(Transaction.Function { tx ->
                val orderRef = firestore.collection("orders").document(orderId)
                val snap = tx.get(orderRef)
                if (!snap.exists()) throw Exception("Order no longer available")
                val existing = snap.data ?: throw Exception("Order no longer available")
                if (existing["status"] != "ready_for_delivery") throw Exception("Order already taken")
                if (!(existing["driverId"] as? String).isNullOrEmpty()) throw Exception("Order already taken")

                tx.update(
                    orderRef,
                    "driverId", driverId,
                    "driverName", driverName,
                    "status", "assigned",
                    "assignedAt", FieldValue.serverTimestamp(),
                    "acceptedAt", FieldValue.serverTimestamp(),
                    "updatedAt", FieldValue.serverTimestamp()
                )
                tx.update(
                    driverDoc(driverId),
                    "available", false,
                    "isOnline", true,
                    "currentOrderId", orderId,
                    "updatedAt", FieldValue.serverTimestamp()
                )
            }).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markPickedUp(orderId: String): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "status" to "picked_up",
                "pickedUpAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            firestore.collection("orders").document(orderId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markInTransit(orderId: String): Result<Unit> {
        return try {
            val updates = hashMapOf<String, Any>(
                "status" to "in_transit",
                "inTransitAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            firestore.collection("orders").document(orderId)
                .update(updates)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Delivering credits the driver's wallet and writes a real transaction,
    // atomically with the order status change (mirrors the web app).
    suspend fun markDelivered(orderId: String): Result<Unit> {
        val driverId = currentUser?.uid ?: return Result.failure(Exception("Not signed in"))
        return try {
            firestore.runTransaction(Transaction.Function { tx ->
                val orderRef = firestore.collection("orders").document(orderId)
                val walletRef = firestore.collection("wallets").document(driverId)
                val driverRef = driverDoc(driverId)
                val orderSnap = tx.get(orderRef)
                val walletSnap = tx.get(walletRef)
                if (!orderSnap.exists()) throw Exception("Order no longer available")
                val order = orderSnap.data ?: throw Exception("Order no longer available")
                if (order["driverId"] != driverId) throw Exception("Not your order")
                val status = order["status"] as? String ?: ""
                if (status == "delivered" || status == "completed") throw Exception("Already delivered")

                val fee = (order["deliveryFee"] as? Number)?.toDouble() ?: 0.0
                val prevBalance = if (walletSnap.exists())
                    (walletSnap.data?.get("balance") as? Number)?.toDouble() ?: 0.0 else 0.0
                val prevEarned = if (walletSnap.exists())
                    (walletSnap.data?.get("totalEarned") as? Number)?.toDouble() ?: 0.0 else 0.0
                val prevCount = if (walletSnap.exists())
                    (walletSnap.data?.get("totalDeliveries") as? Number)?.toLong() ?: 0L else 0L

                tx.update(
                    orderRef,
                    "status", "delivered",
                    "deliveredAt", FieldValue.serverTimestamp(),
                    "updatedAt", FieldValue.serverTimestamp()
                )
                tx.set(
                    walletRef,
                    hashMapOf(
                        "userId" to driverId,
                        "balance" to prevBalance + fee,
                        "totalEarned" to prevEarned + fee,
                        "totalDeliveries" to prevCount + 1,
                        "updatedAt" to FieldValue.serverTimestamp()
                    ),
                    com.google.firebase.firestore.SetOptions.merge()
                )
                tx.set(
                    firestore.collection("transactions").document("del_$orderId"),
                    hashMapOf(
                        "userId" to driverId,
                        "type" to "delivery_earning",
                        "amount" to fee,
                        "orderId" to orderId,
                        "orderTotal" to ((order["total"] as? Number)?.toDouble() ?: 0.0),
                        "createdAt" to FieldValue.serverTimestamp()
                    ),
                    com.google.firebase.firestore.SetOptions.merge()
                )
                tx.update(
                    driverRef,
                    "available", true,
                    "currentOrderId", null,
                    "updatedAt", FieldValue.serverTimestamp()
                )
            }).await()
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
                "latitude" to latitude,
                "longitude" to longitude,
                "lastLocationUpdate" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            driverDoc(driverId).update(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Decline an assigned order — returns it to the delivery pool.
     * Direct Firestore (mirror of the server's PUT /api/driver/orders/:id/decline).
     */
    suspend fun declineOrder(orderId: String, driverId: String): Result<Unit> {
        return try {
            FirebaseFirestore.getInstance().collection("orders")
                .document(orderId)
                .update(
                    mapOf(
                        "driverId" to null,
                        "driverName" to null,
                        "status" to "ready_for_delivery",
                        "declinedBy" to FieldValue.arrayUnion(driverId),
                        "updatedAt" to FieldValue.serverTimestamp(),
                    )
                ).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}