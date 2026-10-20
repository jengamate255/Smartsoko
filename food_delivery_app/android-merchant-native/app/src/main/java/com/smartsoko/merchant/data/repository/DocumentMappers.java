package com.smartsoko.merchant.data.repository;

import com.google.firebase.firestore.DocumentSnapshot;
import com.smartsoko.merchant.data.model.Order;
import com.smartsoko.merchant.data.model.Product;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class DocumentMappers {

    private DocumentMappers() {}

    private static String str(DocumentSnapshot doc, String key) {
        Object v = doc.get(key);
        return v == null ? null : String.valueOf(v);
    }

    private static Double dbl(DocumentSnapshot doc, String key) {
        Object v = doc.get(key);
        if (v instanceof Number) return ((Number) v).doubleValue();
        if (v instanceof String) {
            try { return Double.parseDouble(((String) v).trim()); } catch (Exception ignored) {}
        }
        return null;
    }

    private static boolean boolVal(DocumentSnapshot doc, String key, boolean def) {
        Object v = doc.get(key);
        if (v instanceof Boolean) return (Boolean) v;
        if (v instanceof Number) return ((Number) v).longValue() != 0;
        if (v instanceof String) {
            String s = ((String) v).trim().toLowerCase();
            if (s.equals("true") || s.equals("1")) return true;
            if (s.equals("false") || s.equals("0")) return false;
        }
        return def;
    }

    private static int integer(DocumentSnapshot doc, String key, int def) {
        Double d = dbl(doc, key);
        return d == null ? def : d.intValue();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> mapList(DocumentSnapshot doc, String key) {
        Object v = doc.get(key);
        if (v instanceof List) return (List<Map<String, Object>>) v;
        return new ArrayList<>();
    }

    private static List<String> strList(DocumentSnapshot doc, String key) {
        Object v = doc.get(key);
        List<String> out = new ArrayList<>();
        if (v instanceof List) {
            for (Object o : (List<?>) v) {
                if (o != null) out.add(String.valueOf(o));
            }
        }
        return out;
    }

    private static Object raw(DocumentSnapshot doc, String key) {
        return doc.get(key);
    }

    public static Order toOrder(DocumentSnapshot doc) {
        Order o = new Order();
        o.setId(doc.getId());
        o.setCustomerId(str(doc, "customerId"));
        o.setCustomerName(str(doc, "customerName"));
        o.setCustomerPhone(str(doc, "customerPhone"));
        o.setSellerId(str(doc, "sellerId"));
        o.setSellerName(str(doc, "sellerName"));
        o.setItems(mapList(doc, "items"));
        o.setTotalAmount(dbl(doc, "totalAmount"));
        o.setDeliveryFee(dbl(doc, "deliveryFee"));
        o.setStatus(str(doc, "status"));
        o.setPaymentMethod(str(doc, "paymentMethod"));
        o.setPaymentStatus(str(doc, "paymentStatus"));
        o.setDeliveryAddress(str(doc, "deliveryAddress"));
        o.setDeliveryNotes(str(doc, "deliveryNotes"));
        o.setDriverId(str(doc, "driverId"));
        o.setDriverName(str(doc, "driverName"));
        o.setCreatedAt(raw(doc, "createdAt"));
        o.setUpdatedAt(raw(doc, "updatedAt"));
        o.setAcceptedAt(raw(doc, "acceptedAt"));
        o.setReadyAt(raw(doc, "readyAt"));
        o.setDeliveredAt(raw(doc, "deliveredAt"));
        o.setRating(dbl(doc, "rating"));
        o.setReview(str(doc, "review"));
        return o;
    }

    public static Product toProduct(DocumentSnapshot doc) {
        Product p = new Product();
        p.setId(doc.getId());
        p.setMerchantId(str(doc, "merchantId"));
        p.setName(str(doc, "name"));
        p.setDescription(str(doc, "description"));
        p.setPrice(dbl(doc, "price"));
        p.setOriginalPrice(dbl(doc, "originalPrice"));
        p.setImageUrl(str(doc, "imageUrl"));
        p.setImageUrls(strList(doc, "imageUrls"));
        p.setCategory(str(doc, "category"));
        p.setAvailable(boolVal(doc, "available", true));
        p.setFeatured(boolVal(doc, "featured", false));
        p.setStockQuantity(integer(doc, "stockQuantity", 0));
        p.setUnit(str(doc, "unit"));
        p.setTags(strList(doc, "tags"));
        p.setRating(dbl(doc, "rating"));
        p.setReviewCount(integer(doc, "reviewCount", 0));
        p.setCreatedAt(raw(doc, "createdAt"));
        p.setUpdatedAt(raw(doc, "updatedAt"));
        return p;
    }
}
