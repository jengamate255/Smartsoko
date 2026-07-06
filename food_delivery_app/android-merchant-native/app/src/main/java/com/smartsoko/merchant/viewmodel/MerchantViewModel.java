package com.smartsoko.merchant.viewmodel;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;
import com.google.firebase.firestore.Query;
import com.smartsoko.merchant.data.model.Order;
import com.smartsoko.merchant.data.model.Product;
import com.smartsoko.merchant.data.repository.MerchantRepository;

import java.util.ArrayList;
import java.util.List;

public class MerchantViewModel extends ViewModel {

    private final MerchantRepository repository;
    private final FirebaseFirestore firestore;

    private final MutableLiveData<String> storeName = new MutableLiveData<>();
    private final MutableLiveData<String> storeId = new MutableLiveData<>();
    private final MutableLiveData<List<Order>> orders = new MutableLiveData<>();
    private final MutableLiveData<List<Product>> products = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>();
    private final MutableLiveData<DocumentSnapshot> sellerData = new MutableLiveData<>();

    private FirebaseUser currentUser;
    private ListenerRegistration ordersListener;
    private ListenerRegistration sellerListener;

    public MerchantViewModel() {
        repository = new MerchantRepository();
        firestore = FirebaseFirestore.getInstance();
    }

    public void setCurrentUser(FirebaseUser user) {
        this.currentUser = user;
        loadSellerData();
    }

    private void loadSellerData() {
        if (currentUser == null) return;

        isLoading.setValue(true);

        firestore.collection("sellers")
                .whereEqualTo("ownerId", currentUser.getUid())
                .get()
                .addOnSuccessListener(querySnapshot -> {
                    isLoading.setValue(false);
                    if (!querySnapshot.isEmpty()) {
                        DocumentSnapshot sellerDoc = querySnapshot.getDocuments().get(0);
                        sellerData.setValue(sellerDoc);
                        storeId.setValue(sellerDoc.getId());

                        String name = sellerDoc.getString("name");
                        if (name != null) {
                            storeName.setValue(name);
                        }

                        listenToOrders(sellerDoc.getId());
                    } else {
                        errorMessage.setValue("No store found for this account");
                    }
                })
                .addOnFailureListener(e -> {
                    isLoading.setValue(false);
                    errorMessage.setValue("Error loading store: " + e.getMessage());
                });
    }

    private void listenToOrders(String sellerId) {
        if (ordersListener != null) {
            ordersListener.remove();
        }

        ordersListener = firestore.collection("orders")
                .whereEqualTo("sellerId", sellerId)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .addSnapshotListener((snapshot, error) -> {
                    if (error != null) {
                        errorMessage.setValue("Error loading orders: " + error.getMessage());
                        return;
                    }

                    if (snapshot != null) {
                        List<Order> orderList = new ArrayList<>();
                        for (DocumentSnapshot doc : snapshot.getDocuments()) {
                            Order order = doc.toObject(Order.class);
                            if (order != null) {
                                order.setId(doc.getId());
                                orderList.add(order);
                            }
                        }
                        orders.setValue(orderList);
                    }
                });
    }

    public void loadProducts() {
        String sId = storeId.getValue();
        if (sId == null) return;

        isLoading.setValue(true);
        repository.getProducts(sId, new MerchantRepository.OnProductsLoadedListener() {
            @Override
            public void onProductsLoaded(List<Product> productList) {
                isLoading.setValue(false);
                products.setValue(productList);
            }

            @Override
            public void onError(String error) {
                isLoading.setValue(false);
                errorMessage.setValue(error);
            }
        });
    }

    public void updateOrderStatus(String orderId, String status) {
        repository.updateOrderStatus(orderId, status, new MerchantRepository.OnOperationCompleteListener() {
            @Override
            public void onSuccess() {
                // Order updated, listener will refresh
            }

            @Override
            public void onError(String error) {
                errorMessage.setValue(error);
            }
        });
    }

    public void acceptOrder(String orderId) {
        updateOrderStatus(orderId, "accepted");
    }

    public void rejectOrder(String orderId) {
        updateOrderStatus(orderId, "rejected");
    }

    public void markOrderReady(String orderId) {
        updateOrderStatus(orderId, "ready");
    }

    public void markOrderDelivered(String orderId) {
        updateOrderStatus(orderId, "delivered");
    }

    public void toggleProductAvailability(String productId, boolean available) {
        repository.updateProductAvailability(productId, available, new MerchantRepository.OnOperationCompleteListener() {
            @Override
            public void onSuccess() {
                loadProducts();
            }

            @Override
            public void onError(String error) {
                errorMessage.setValue(error);
            }
        });
    }

    public void deleteProduct(String productId) {
        repository.deleteProduct(productId, new MerchantRepository.OnOperationCompleteListener() {
            @Override
            public void onSuccess() {
                loadProducts();
            }

            @Override
            public void onError(String error) {
                errorMessage.setValue(error);
            }
        });
    }

    public void saveProduct(Product product) {
        String sId = storeId.getValue();
        if (sId == null) return;

        product.setMerchantId(sId);
        repository.saveProduct(product, new MerchantRepository.OnOperationCompleteListener() {
            @Override
            public void onSuccess() {
                loadProducts();
            }

            @Override
            public void onError(String error) {
                errorMessage.setValue(error);
            }
        });
    }

    // Getters
    public LiveData<String> getStoreName() { return storeName; }
    public LiveData<String> getStoreId() { return storeId; }
    public LiveData<List<Order>> getOrders() { return orders; }
    public LiveData<List<Product>> getProducts() { return products; }
    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getErrorMessage() { return errorMessage; }
    public LiveData<DocumentSnapshot> getSellerData() { return sellerData; }

    @Override
    protected void onCleared() {
        super.onCleared();
        if (ordersListener != null) {
            ordersListener.remove();
        }
        if (sellerListener != null) {
            sellerListener.remove();
        }
    }
}
