package com.fooddelivery.driver;

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
                try {
                    JSONObject userJson = new JSONObject(user);
                    String userId = userJson.getString("id");
                    
                    // Save to preferences for background tracking
                    android.content.SharedPreferences prefs = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE);
                    android.content.SharedPreferences.Editor editor = prefs.edit();
                    editor.putString("auth_token", token);
                    editor.putString("driver_id", userId);
                    editor.apply();
                } catch (Exception e) {
                    Log.e(TAG, "Error saving auth data", e);
                }

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
                try {
                    JSONObject userJson = new JSONObject(user);
                    String userId = userJson.getString("id");
                    
                    // Save to preferences for background tracking
                    android.content.SharedPreferences prefs = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE);
                    android.content.SharedPreferences.Editor editor = prefs.edit();
                    editor.putString("auth_token", token);
                    editor.putString("driver_id", userId);
                    editor.apply();
                } catch (Exception e) {
                    Log.e(TAG, "Error saving auth data", e);
                }

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
    public void getAvailableOrders() {
        supabaseClient.getAvailableOrders(new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getAvailableOrders', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getAvailableOrders', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void acceptOrder(String orderId, String authToken) {
        String driverId = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE)
            .getString("driver_id", "");
        supabaseClient.acceptOrder(orderId, driverId, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('acceptOrder', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('acceptOrder', 'error', '" + error + "')",
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
    public void updateLocation(double lat, double lng, String authToken) {
        String driverId = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE)
            .getString("driver_id", "");
        supabaseClient.updateDriverLocation(driverId, lat, lng, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('updateLocation', 'success', '" + data + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('updateLocation', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void getEarnings(String authToken) {
        String driverId = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE)
            .getString("driver_id", "");
        supabaseClient.getDriverEarnings(driverId, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getEarnings', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getEarnings', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void getDriverOrders(String authToken) {
        String driverId = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE)
            .getString("driver_id", "");
        supabaseClient.getDriverOrders(driverId, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getDriverOrders', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getDriverOrders', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void getDriverHistory(String authToken) {
        String driverId = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE)
            .getString("driver_id", "");
        supabaseClient.getDriverHistory(driverId, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getDriverHistory', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getDriverHistory', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void getDriverProfile(String authToken) {
        String driverId = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE)
            .getString("driver_id", "");
        supabaseClient.getDriverProfile(driverId, authToken, new SupabaseClient.DataCallback() {
            @Override
            public void onSuccess(String data) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getDriverProfile', 'success', '" + data.replace("'", "\\'") + "')",
                        null
                    );
                });
            }

            @Override
            public void onError(String error) {
                mainActivity.runOnUiThread(() -> {
                    mainActivity.getWebView().evaluateJavascript(
                        "window.supabaseBridgeCallback('getDriverProfile', 'error', '" + error + "')",
                        null
                    );
                });
            }
        });
    }

    @JavascriptInterface
    public void subscribeToOrders(String authToken) {
        supabaseClient.subscribeToOrders(authToken, new SupabaseClient.RealtimeCallback() {
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
    public void savePreference(String key, String value) {
        android.content.SharedPreferences prefs = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = prefs.edit();
        editor.putString(key, value);
        editor.apply();
        Log.d(TAG, "Saved preference: " + key + " = " + value);
    }

    @JavascriptInterface
    public String getPreference(String key, String defaultValue) {
        android.content.SharedPreferences prefs = mainActivity.getSharedPreferences("DriverPrefs", android.content.Context.MODE_PRIVATE);
        String value = prefs.getString(key, defaultValue);
        Log.d(TAG, "Got preference: " + key + " = " + value);
        return value;
    }

    public void cleanup() {
        if (supabaseClient != null) {
            supabaseClient.shutdown();
        }
    }
}