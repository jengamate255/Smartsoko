package com.fooddelivery.merchant;

import android.webkit.JavascriptInterface;
import android.util.Log;
import org.json.JSONObject;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * JavaScript Bridge for WebView to communicate with Supabase
 * Allows web app to use Android's native HTTP requests
 */
public class SupabaseBridge {
    private static final String TAG = "SupabaseBridge";
    private SupabaseClient supabaseClient;
    private MainActivity mainActivity;

    public SupabaseBridge(MainActivity activity) {
        this.mainActivity = activity;
        this.supabaseClient = new SupabaseClient();
    }

    @JavascriptInterface
    public void testConnection() {
        supabaseClient.testConnection(new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('testConnection', 'success', '" + data + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('testConnection', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void signIn(String email, String password) {
        supabaseClient.signIn(email, password, new SupabaseClient.AuthCallback() {
            @Override
            public void onSuccess(String token, String user) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('signIn', 'success', JSON.stringify({token: '" + token + "', user: " + user + "}))",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('signIn', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void signUp(String email, String password, String name) {
        supabaseClient.signUp(email, password, name, new SupabaseClient.AuthCallback() {
            @Override
            public void onSuccess(String token, String user) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('signUp', 'success', JSON.stringify({token: '" + token + "', user: " + user + "}))",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('signUp', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void getRestaurantProfile(String authToken) {
        String restaurantId = mainActivity.getSharedPreferences("MerchantPrefs", android.content.Context.MODE_PRIVATE)
            .getString("restaurant_id", "");
        supabaseClient.getRestaurantProfile(restaurantId, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getRestaurantProfile', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getRestaurantProfile', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void getOrders(String authToken) {
        String restaurantId = mainActivity.getSharedPreferences("MerchantPrefs", android.content.Context.MODE_PRIVATE)
            .getString("restaurant_id", "");
        supabaseClient.getOrders(restaurantId, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getOrders', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getOrders', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void updateOrderStatus(String orderId, String status, String authToken) {
        supabaseClient.updateOrderStatus(orderId, status, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('updateOrderStatus', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('updateOrderStatus', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void updateMenuItem(String itemId, String itemData, String authToken) {
        supabaseClient.updateMenuItem(itemId, itemData, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('updateMenuItem', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('updateMenuItem', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void getAnalytics(String authToken) {
        String restaurantId = mainActivity.getSharedPreferences("MerchantPrefs", android.content.Context.MODE_PRIVATE)
            .getString("restaurant_id", "");
        supabaseClient.getAnalytics(restaurantId, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getAnalytics', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getAnalytics', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void createPromotion(String promoData, String authToken) {
        supabaseClient.createPromotion(promoData, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('createPromotion', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('createPromotion', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void subscribeToOrders(String authToken) {
        String restaurantId = mainActivity.getSharedPreferences("MerchantPrefs", android.content.Context.MODE_PRIVATE)
            .getString("restaurant_id", "");
        supabaseClient.subscribeToOrders(restaurantId, authToken, new SupabaseClient.RealtimeCallback() {
            @Override
            public void onMessage(String message) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('subscribeToOrders', 'message', '" + message + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('subscribeToOrders', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void showToast(String message) {
        mainActivity.runOnUiThread(() -> {
            android.widget.Toast.makeText(mainActivity, message, android.widget.Toast.LENGTH_SHORT).show();
        });
    }

    @JavascriptInterface
    public void shareApp(String message) {
        android.content.Intent shareIntent = new android.content.Intent(android.content.Intent.ACTION_SEND);
        shareIntent.setType("text/plain");
        shareIntent.putExtra(android.content.Intent.EXTRA_TEXT, message);
        mainActivity.startActivity(android.content.Intent.createChooser(shareIntent, "Share Food Delivery App"));
    }

    @JavascriptInterface
    public void openMaps(String address) {
        android.content.Intent mapIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW,
            android.net.Uri.parse("geo:0,0?q=" + address));
        mapIntent.setPackage("com.google.android.apps.maps");
        mainActivity.startActivity(mapIntent);
    }

    @JavascriptInterface
    public void callPhone(String phoneNumber) {
        android.content.Intent callIntent = new android.content.Intent(android.content.Intent.ACTION_DIAL);
        callIntent.setData(android.net.Uri.parse("tel:" + phoneNumber));
        mainActivity.startActivity(callIntent);
    }

    @JavascriptInterface
    public void sendEmail(String email) {
        android.content.Intent emailIntent = new android.content.Intent(android.content.Intent.ACTION_SENDTO);
        emailIntent.setData(android.net.Uri.parse("mailto:" + email));
        mainActivity.startActivity(emailIntent);
    }

    @JavascriptInterface
    public void printOrder(String orderId, String authToken) {
        // Simplified print implementation - in production, use proper printing APIs
        mainActivity.runOnUiThread(() -> {
            android.widget.Toast.makeText(mainActivity, "Print order: " + orderId, android.widget.Toast.LENGTH_SHORT).show();
        });
    }

    public void cleanup() {
        if (supabaseClient != null) {
            supabaseClient.shutdown();
        }
    }
}