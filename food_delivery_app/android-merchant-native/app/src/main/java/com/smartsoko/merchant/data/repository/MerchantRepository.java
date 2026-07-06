package com.smartsoko.merchant.data.repository;

import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.SetOptions;
import com.smartsoko.merchant.data.model.Order;
import com.smartsoko.merchant.data.model.Product;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
                        Product product = doc.toObject(Product.class);
                        if (product != null) {
                            product.setId(doc.getId());
                            products.add(product);
                        }
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
                        Order order = doc.toObject(Order.class);
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
