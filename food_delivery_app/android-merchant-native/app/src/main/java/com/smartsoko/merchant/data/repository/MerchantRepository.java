package com.smartsoko.merchant.data.repository;

import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.SetOptions;
import com.smartsoko.merchant.data.model.Order;
import com.smartsoko.merchant.data.model.Product;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

public class MerchantRepository {

    private final FirebaseFirestore firestore;

    public MerchantRepository() {
        firestore = FirebaseFirestore.getInstance();
    }

    public void getProducts(String merchantId, OnProductsLoadedListener listener) {
        firestore.collection("products")
                .whereEqualTo("merchantId", merchantId)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .get()
                .addOnSuccessListener(querySnapshot -> {
                    List<Product> products = new ArrayList<>();
                    for (var doc : querySnapshot.getDocuments()) {
                        products.add(DocumentMappers.toProduct(doc));
                    }
                    listener.onProductsLoaded(products);
                })
                .addOnFailureListener(e -> listener.onError(e.getMessage()));
    }

    public void updateOrderStatus(String orderId, String status, OnOperationCompleteListener listener) {
        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status);
        updates.put("updatedAt", new java.util.Date());

        firestore.collection("orders").document(orderId)
                .update(updates)
                .addOnSuccessListener(aVoid -> listener.onSuccess())
                .addOnFailureListener(e -> listener.onError(e.getMessage()));
    }

    public void updateProductAvailability(String productId, boolean available, OnOperationCompleteListener listener) {
        firestore.collection("products").document(productId)
                .update("available", available, "updatedAt", new java.util.Date())
                .addOnSuccessListener(aVoid -> listener.onSuccess())
                .addOnFailureListener(e -> listener.onError(e.getMessage()));
    }

    public void deleteProduct(String productId, OnOperationCompleteListener listener) {
        firestore.collection("products").document(productId)
                .delete()
                .addOnSuccessListener(aVoid -> listener.onSuccess())
                .addOnFailureListener(e -> listener.onError(e.getMessage()));
    }

    public void saveProduct(Product product, OnOperationCompleteListener listener) {
        if (product.getId() == null || product.getId().isEmpty()) {
            // New product
            product.setCreatedAt(new java.util.Date());
            firestore.collection("products")
                    .add(product)
                    .addOnSuccessListener(documentReference -> listener.onSuccess())
                    .addOnFailureListener(e -> listener.onError(e.getMessage()));
        } else {
            // Update existing
            product.setUpdatedAt(new java.util.Date());
            firestore.collection("products").document(product.getId())
                    .set(product, SetOptions.merge())
                    .addOnSuccessListener(aVoid -> listener.onSuccess())
                    .addOnFailureListener(e -> listener.onError(e.getMessage()));
        }
    }

    public void getOrderStatistics(String merchantId, long startDate, long endDate, OnStatisticsLoadedListener listener) {
        firestore.collection("orders")
                .whereEqualTo("sellerId", merchantId)
                .whereGreaterThanOrEqualTo("createdAt", new java.util.Date(startDate))
                .whereLessThanOrEqualTo("createdAt", new java.util.Date(endDate))
                .get()
                .addOnSuccessListener(querySnapshot -> {
                    double totalRevenue = 0;
                    int totalOrders = querySnapshot.size();
                    int pendingOrders = 0;
                    int completedOrders = 0;

                    for (var doc : querySnapshot.getDocuments()) {
                        Order order = DocumentMappers.toOrder(doc);
                        if (order != null) {
                            Double amount = order.getTotalAmount();
                            if (amount != null) {
                                totalRevenue += amount;
                            }

                            String status = order.getStatus();
                            if ("pending".equals(status) || "accepted".equals(status) || "ready".equals(status)) {
                                pendingOrders++;
                            } else if ("delivered".equals(status) || "completed".equals(status)) {
                                completedOrders++;
                            }
                        }
                    }

                    listener.onStatisticsLoaded(totalRevenue, totalOrders, pendingOrders, completedOrders);
                })
                .addOnFailureListener(e -> listener.onError(e.getMessage()));
    }

    public void getReviews(String merchantId, OnReviewsLoadedListener listener) {
        firestore.collection("reviews")
                .whereEqualTo("sellerId", merchantId)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(50)
                .get()
                .addOnSuccessListener(querySnapshot -> {
                    List<Map<String, Object>> reviews = new ArrayList<>();
                    double totalRating = 0;
                    int count = 0;

                    for (var doc : querySnapshot.getDocuments()) {
                        Map<String, Object> review = new HashMap<>();
                        review.put("id", doc.getId());
                        review.put("customerName", doc.getString("customerName"));
                        review.put("rating", doc.getDouble("rating"));
                        review.put("comment", doc.getString("comment"));
                        review.put("createdAt", doc.getDate("createdAt"));
                        reviews.add(review);

                        Double rating = doc.getDouble("rating");
                        if (rating != null) {
                            totalRating += rating;
                            count++;
                        }
                    }

                    double averageRating = count > 0 ? totalRating / count : 0;
                    listener.onReviewsLoaded(reviews, averageRating, count);
                })
                .addOnFailureListener(e -> listener.onError(e.getMessage()));
    }

    public void extractProductFromImage(byte[] imageData, OnProductExtractedListener listener) {
        new Thread(() -> {
            try {
                URL url = new URL("https://vonkqyiczeqhuqhahsxm.supabase.co/functions/v1/ai/products/extract");
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "image/jpeg");
                connection.setRequestProperty("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8");
                connection.setDoOutput(true);
                connection.getOutputStream().write(imageData);
                connection.connect();

                int responseCode = connection.getResponseCode();
                StringBuilder response = new StringBuilder();
                try (BufferedReader in = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    String inputLine;
                    while ((inputLine = in.readLine()) != null) {
                        response.append(inputLine);
                    }
                }

                if (responseCode == HttpURLConnection.HTTP_OK) {
                    // Parse JSON response: {"name":"...","price":...,"description":"...,"category":...,"tags":[...]}
                    JSONObject json = new JSONObject(response.toString());
                    Product extractedProduct = new Product();
                    extractedProduct.setName(json.optString("name", ""));
                    extractedProduct.setDescription(json.optString("description", ""));
                    extractedProduct.setPrice(json.optDouble("price", 0.0));
                    extractedProduct.setCategory(json.optString("category", ""));
                    ArrayList<String> tags = new ArrayList<>();
                    JSONArray tagsArray = json.optJSONArray("tags");
                    if (tagsArray != null) {
                        for (int i = 0; i < tagsArray.length(); i++) {
                            tags.add(tagsArray.optString(i));
                        }
                    }
                    extractedProduct.setTags(tags);
                    listener.onProductExtracted(extractedProduct, null);
                } else {
                    listener.onError("AI extraction failed: HTTP " + responseCode);
                }
            } catch (Exception e) {
                listener.onError("AI extraction error: " + e.getMessage());
            }
        }).start();
    }

    public interface OnProductExtractedListener {
        void onProductExtracted(Product product, String error);
        void onError(String error);
    }

    // Interfaces
    public interface OnProductsLoadedListener {
        void onProductsLoaded(List<Product> products);
        void onError(String error);
    }

    public interface OnOperationCompleteListener {
        void onSuccess();
        void onError(String error);
    }

    public interface OnStatisticsLoadedListener {
        void onStatisticsLoaded(double totalRevenue, int totalOrders, int pendingOrders, int completedOrders);
        void onError(String error);
    }

    public interface OnReviewsLoadedListener {
        void onReviewsLoaded(List<Map<String, Object>> reviews, double averageRating, int totalReviews);
        void onError(String error);
    }
}
