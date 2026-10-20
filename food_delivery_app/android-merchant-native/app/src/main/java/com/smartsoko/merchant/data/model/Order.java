package com.smartsoko.merchant.data.model;

import java.util.Date;
import java.util.List;
import java.util.Map;

public class Order implements java.io.Serializable {
    private String id;
    private String customerId;
    private String customerName;
    private String customerPhone;
    private String sellerId;
    private String sellerName;
    private List<Map<String, Object>> items;
    private Double totalAmount;
    private Double deliveryFee;
    private String status; // pending, accepted, ready, delivered, completed, cancelled, rejected
    private String paymentMethod;
    private String paymentStatus;
    private String deliveryAddress;
    private String deliveryNotes;
    private String driverId;
    private String driverName;
    private Object createdAt;
    private Object updatedAt;
    private Object acceptedAt;
    private Object readyAt;
    private Object deliveredAt;
    private Double rating;
    private String review;

    public Order() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getSellerId() { return sellerId; }
    public void setSellerId(String sellerId) { this.sellerId = sellerId; }

    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }

    public List<Map<String, Object>> getItems() { return items; }
    public void setItems(List<Map<String, Object>> items) { this.items = items; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public Double getDeliveryFee() { return deliveryFee; }
    public void setDeliveryFee(Double deliveryFee) { this.deliveryFee = deliveryFee; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getDeliveryNotes() { return deliveryNotes; }
    public void setDeliveryNotes(String deliveryNotes) { this.deliveryNotes = deliveryNotes; }

    public String getDriverId() { return driverId; }
    public void setDriverId(String driverId) { this.driverId = driverId; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public Date getCreatedAt() { return DateUtils.toDate(createdAt); }
    public void setCreatedAt(Object createdAt) { this.createdAt = createdAt; }

    public Date getUpdatedAt() { return DateUtils.toDate(updatedAt); }
    public void setUpdatedAt(Object updatedAt) { this.updatedAt = updatedAt; }

    public Date getAcceptedAt() { return DateUtils.toDate(acceptedAt); }
    public void setAcceptedAt(Object acceptedAt) { this.acceptedAt = acceptedAt; }

    public Date getReadyAt() { return DateUtils.toDate(readyAt); }
    public void setReadyAt(Object readyAt) { this.readyAt = readyAt; }

    public Date getDeliveredAt() { return DateUtils.toDate(deliveredAt); }
    public void setDeliveredAt(Object deliveredAt) { this.deliveredAt = deliveredAt; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public String getReview() { return review; }
    public void setReview(String review) { this.review = review; }

    public String getFormattedItems() {
        if (items == null || items.isEmpty()) return "No items";

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size(); i++) {
            Map<String, Object> item = items.get(i);
            String name = (String) item.get("name");
            Object q = item.getOrDefault("quantity", 1);
            String qty = q instanceof Number ? String.valueOf(((Number) q).longValue()) : String.valueOf(q);
            if (name == null) name = "item";

            if (i > 0) sb.append(", ");
            sb.append(qty).append("x ").append(name);
        }
        return sb.toString();
    }

    public int getStatusColor() {
        switch (status != null ? status.toLowerCase() : "") {
            case "pending":
                return android.graphics.Color.parseColor("#FF9800"); // Orange
            case "accepted":
                return android.graphics.Color.parseColor("#2196F3"); // Blue
            case "ready":
                return android.graphics.Color.parseColor("#9C27B0"); // Purple
            case "delivered":
            case "completed":
                return android.graphics.Color.parseColor("#4CAF50"); // Green
            case "cancelled":
            case "rejected":
                return android.graphics.Color.parseColor("#F44336"); // Red
            default:
                return android.graphics.Color.GRAY;
        }
    }

    public String getStatusDisplayName() {
        if (status == null) return "Unknown";
        return status.substring(0, 1).toUpperCase() + status.substring(1);
    }
}
