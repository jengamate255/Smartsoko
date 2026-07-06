package com.smartsoko.merchant.data.model;

import java.util.Date;
import java.util.List;

public class Product {
    private String id;
    private String merchantId;
    private String name;
    private String description;
    private Double price;
    private Double originalPrice;
    private String imageUrl;
    private List<String> imageUrls;
    private String category;
    private boolean available;
    private boolean featured;
    private int stockQuantity;
    private String unit;
    private List<String> tags;
    private Double rating;
    private int reviewCount;
    private Date createdAt;
    private Date updatedAt;

    public Product() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMerchantId() { return merchantId; }
    public void setMerchantId(String merchantId) { this.merchantId = merchantId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getPrice() { return price != null ? price : 0.0; }
    public void setPrice(Double price) { this.price = price; }

    public Double getOriginalPrice() { return originalPrice; }
    public void setOriginalPrice(Double originalPrice) { this.originalPrice = originalPrice; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }

    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }

    public int getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(int stockQuantity) { this.stockQuantity = stockQuantity; }

    public String getUnit() { return unit != null ? unit : "item"; }
    public void setUnit(String unit) { this.unit = unit; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }

    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }

    public String getFormattedPrice() {
        return String.format("KSh %.2f", getPrice());
    }

    public String getDisplayImageUrl() {
        if (imageUrl != null && !imageUrl.isEmpty()) {
            return imageUrl;
        }
        if (imageUrls != null && !imageUrls.isEmpty()) {
            return imageUrls.get(0);
        }
        return null;
    }

    public boolean hasDiscount() {
        return originalPrice != null && originalPrice > getPrice();
    }

    public double getDiscountPercentage() {
        if (!hasDiscount()) return 0;
        return ((originalPrice - getPrice()) / originalPrice) * 100;
    }
}
