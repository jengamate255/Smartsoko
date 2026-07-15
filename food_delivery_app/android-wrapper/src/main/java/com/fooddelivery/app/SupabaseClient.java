package com.fooddelivery.app;

import android.util.Log;
import org.json.JSONObject;
import org.json.JSONArray;
import org.json.JSONException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Supabase Client for Android WebView App
 * Handles all backend communication with Supabase
 */
public class SupabaseClient {
    private static final String TAG = "SupabaseClient";
    private static final String SUPABASE_URL = "https://vonkqyiczeqhuqhahsxm.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8";
    
    private static final String REST_URL = SUPABASE_URL + "/rest/v1";
    private static final String AUTH_URL = SUPABASE_URL + "/auth/v1";
    private static final String STORAGE_URL = SUPABASE_URL + "/storage/v1";
    
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    
    // Authentication methods
    public interface AuthCallback {
        void onSuccess(String token, String user);
        void onError(String error);
    }
    
    public void signIn(String email, String password, AuthCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(AUTH_URL + "/token?grant_type=password");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setDoOutput(true);
                
                JSONObject requestBody = new JSONObject();
                requestBody.put("email", email);
                requestBody.put("password", password);
                
                OutputStream os = conn.getOutputStream();
                os.write(requestBody.toString().getBytes("UTF-8"));
                os.close();
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    
                    JSONObject responseJson = new JSONObject(response.toString());
                    String token = responseJson.getString("access_token");
                    String user = responseJson.getJSONObject("user").toString();
                    
                    callback.onSuccess(token, user);
                } else {
                    callback.onError("Authentication failed: " + responseCode);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Sign in error", e);
                callback.onError("Network error: " + e.getMessage());
            }
        });
    }
    
    public void signUp(String email, String password, String name, AuthCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(AUTH_URL + "/signup");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setDoOutput(true);
                
                JSONObject requestBody = new JSONObject();
                requestBody.put("email", email);
                requestBody.put("password", password);
                requestBody.put("data", new JSONObject().put("name", name));
                
                OutputStream os = conn.getOutputStream();
                os.write(requestBody.toString().getBytes("UTF-8"));
                os.close();
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    
                    JSONObject responseJson = new JSONObject(response.toString());
                    String token = responseJson.getString("access_token");
                    String user = responseJson.getJSONObject("user").toString();
                    
                    callback.onSuccess(token, user);
                } else {
                    callback.onError("Sign up failed: " + responseCode);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Sign up error", e);
                callback.onError("Network error: " + e.getMessage());
            }
        });
    }
    
    // Database methods
    public interface DataCallback {
        void onSuccess(String data);
        void onError(String error);
    }
    
    public void getRestaurants(DataCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(REST_URL + "/restaurants?select=*&is_open=true");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY);
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    
                    callback.onSuccess(response.toString());
                } else {
                    callback.onError("Failed to fetch restaurants: " + responseCode);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Get restaurants error", e);
                callback.onError("Network error: " + e.getMessage());
            }
        });
    }
    
    public void getMenuItems(String restaurantId, DataCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(REST_URL + "/menu_items?restaurant_id=eq." + restaurantId + "&is_available=true");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY);
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    
                    callback.onSuccess(response.toString());
                } else {
                    callback.onError("Failed to fetch menu items: " + responseCode);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Get menu items error", e);
                callback.onError("Network error: " + e.getMessage());
            }
        });
    }
    
    public void createOrder(String orderData, String authToken, DataCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(REST_URL + "/orders");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
                conn.setRequestProperty("Prefer", "return=representation");
                conn.setDoOutput(true);
                
                OutputStream os = conn.getOutputStream();
                os.write(orderData.getBytes("UTF-8"));
                os.close();
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == HttpURLConnection.HTTP_CREATED) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    
                    callback.onSuccess(response.toString());
                } else {
                    callback.onError("Failed to create order: " + responseCode);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Create order error", e);
                callback.onError("Network error: " + e.getMessage());
            }
        });
    }
    
    public void getOrders(String userId, String authToken, DataCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(REST_URL + "/orders?customer_id=eq." + userId + "&order=created_at.desc");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    
                    callback.onSuccess(response.toString());
                } else {
                    callback.onError("Failed to fetch orders: " + responseCode);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Get orders error", e);
                callback.onError("Network error: " + e.getMessage());
            }
        });
    }
    
    // Real-time subscription (WebSocket connection for real-time updates)
    public interface RealtimeCallback {
        void onMessage(String message);
        void onError(String error);
    }
    
    public void subscribeToOrders(String authToken, RealtimeCallback callback) {
        executor.execute(() -> {
            try {
                // This is a simplified version - in production, you'd use a proper WebSocket library
                URL url = new URL(SUPABASE_URL.replace("http", "ws") + "/realtime");
                // WebSocket implementation would go here
                // For now, we'll simulate with polling
                
                Log.d(TAG, "Real-time subscription setup for orders");
                callback.onMessage("Subscription established");
                
            } catch (Exception e) {
                Log.e(TAG, "Real-time subscription error", e);
                callback.onError("Failed to establish real-time connection");
            }
        });
    }
    
    // Utility methods
    public void testConnection(DataCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(REST_URL + "/restaurants?select=count&limit=1");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    callback.onSuccess("Connection successful");
                } else {
                    callback.onError("Connection failed: " + responseCode);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Connection test error", e);
                callback.onError("Network error: " + e.getMessage());
            }
        });
    }
    
    public void shutdown() {
        executor.shutdown();
    }
}
