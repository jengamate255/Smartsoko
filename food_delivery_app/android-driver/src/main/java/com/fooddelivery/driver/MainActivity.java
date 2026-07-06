package com.fooddelivery.driver;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.location.LocationManager;
import android.location.LocationListener;
import android.location.Location;

public class MainActivity extends Activity implements LocationListener {
    private WebView webView;
    private ProgressBar progressBar;
    private SupabaseBridge supabaseBridge;
    private SharedPreferences sharedPreferences;
    private LocationManager locationManager;
    private static final String PREFS_NAME = "DriverPrefs";
    private static final String LAST_URL_KEY = "last_url";
    private static final String DRIVER_ID_KEY = "driver_id";
    private static final String AUTH_TOKEN_KEY = "auth_token";
    private SupabaseClient supabaseClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progressBar);
        sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        // Initialize location services
        setupLocationServices();
        
        // Initialize Supabase bridge and client
        supabaseClient = new SupabaseClient();
        supabaseBridge = new SupabaseBridge(this);

        setupWebView();
        loadDriverApp();
    }

    private void setupLocationServices() {
        try {
            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            
            // Request location updates
            if (locationManager != null) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000, // 5 seconds
                    10,   // 10 meters
                    this);
                    
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    10000, // 10 seconds
                    50,    // 50 meters
                    this);
            }
        } catch (SecurityException e) {
            android.util.Log.e("DriverApp", "Location permission denied", e);
        }
    }

    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        
        // Enable JavaScript
        webSettings.setJavaScriptEnabled(true);
        
        // Enable DOM Storage
        webSettings.setDomStorageEnabled(true);
        
        // Enable caching
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Enable responsive design
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        
        // Enable zoom
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        
        // Allow file access
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        // Set user agent
        String userAgent = webSettings.getUserAgentString();
        webSettings.setUserAgentString(userAgent + " FoodDeliveryDriver/1.0");

        // Add JavaScript interface for driver-specific features
        webView.addJavascriptInterface(supabaseBridge, "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                
                // Save last URL
                SharedPreferences.Editor editor = sharedPreferences.edit();
                editor.putString(LAST_URL_KEY, url);
                editor.apply();
                
                // Inject driver-specific bridge
                injectDriverBridge();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                
                if (!isNetworkAvailable()) {
                    loadOfflinePage();
                } else {
                    Toast.makeText(MainActivity.this, "Error loading page", Toast.LENGTH_SHORT).show();
                }
            }
            
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Handle driver-specific URLs
                if (url.startsWith("tel:")) {
                    Intent intent = new Intent(Intent.ACTION_DIAL);
                    intent.setData(Uri.parse(url));
                    startActivity(intent);
                    return true;
                } else if (url.startsWith("mailto:")) {
                    Intent intent = new Intent(Intent.ACTION_SENDTO);
                    intent.setData(Uri.parse(url));
                    startActivity(intent);
                    return true;
                } else if (url.startsWith("geo:")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse(url));
                    startActivity(intent);
                    return true;
                } else if (url.startsWith("fooddelivery://")) {
                    handleDriverDeepLink(url);
                    return true;
                }
                
                return false;
            }
        });
        
        // Set WebChrome client for progress and console
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                super.onProgressChanged(view, newProgress);
            }
            
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                android.util.Log.d("DriverWebView", consoleMessage.message() + 
                    " at " + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber());
                return true;
            }
        });
    }
    
    private void injectDriverBridge() {
        String javascript = "if (typeof window.AndroidBridge !== 'undefined') {" +
            "window.driverApp = {" +
                "getAvailableOrders: function(authToken) { window.AndroidBridge.getAvailableOrders(authToken); }," +
                "acceptOrder: function(orderId, authToken) { window.AndroidBridge.acceptOrder(orderId, authToken); }," +
                "updateLocation: function(lat, lng, authToken) { window.AndroidBridge.updateLocation(lat, lng, authToken); }," +
                "updateOrderStatus: function(orderId, status, authToken) { window.AndroidBridge.updateOrderStatus(orderId, status, authToken); }," +
                "getMyOrders: function(authToken) { window.AndroidBridge.getDriverOrders(authToken); }," +
                "getHistory: function(authToken) { window.AndroidBridge.getDriverHistory(authToken); }," +
                "getProfile: function(authToken) { window.AndroidBridge.getDriverProfile(authToken); }," +
                "getEarnings: function(authToken) { window.AndroidBridge.getEarnings(authToken); }," +
                "startNavigation: function(address) { window.AndroidBridge.openMaps(address); }," +
                "callCustomer: function(phone) { window.AndroidBridge.callPhone(phone); }," +
                "showToast: function(message) { window.AndroidBridge.showToast(message); }," +
                "shareApp: function(message) { window.AndroidBridge.shareApp(message); }," +
                "getCurrentLocation: function() { return window.AndroidBridge.getCurrentLocation(); }" +
            "};" +
            "window.driverBridgeCallback = function(method, status, data) {" +
                "console.log('Driver Bridge Response:', method, status, data);" +
                "if (window.driverListeners && window.driverListeners[method]) {" +
                    "window.driverListeners[method](status, data);" +
                "}" +
            "};" +
            "console.log('Driver Bridge initialized');" +
        "}";
        
        webView.evaluateJavascript(javascript, null);
    }

    private void loadDriverApp() {
        String lastUrl = sharedPreferences.getString(LAST_URL_KEY, null);
        
        if (lastUrl != null && !lastUrl.isEmpty()) {
            webView.loadUrl(lastUrl);
        } else if (isNetworkAvailable()) {
            // Load driver app
            webView.loadUrl("https://food-delivery-smartsoko.vercel.app/driver.html");
        } else {
            loadOfflinePage();
        }
    }
    
    private void handleDriverDeepLink(String url) {
        Uri uri = Uri.parse(url);
        String path = uri.getPath();
        
        if (path != null) {
            if (path.equals("/order")) {
                String orderId = uri.getQueryParameter("id");
                if (orderId != null) {
                    webView.loadUrl("https://smartsoko-marketplace.vercel.app/driver.html?order=" + orderId);
                }
            } else if (path.equals("/navigation")) {
                String address = uri.getQueryParameter("address");
                if (address != null) {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse("geo:0,0?q=" + address));
                    startActivity(intent);
                }
            }
        }
    }
    
    private void loadOfflinePage() {
        String offlineHtml = "<!DOCTYPE html><html><head><title>Driver App - Offline</title></head>" +
            "<body style='font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;'>" +
            "<div style='max-width: 400px; margin: 0 auto;'>" +
            "<h2 style='color: #ff6600;'>🚚 No Internet Connection</h2>" +
            "<p style='color: #666;'>Please check your internet connection and try again.</p>" +
            "<button onclick='location.reload()' style='padding: 15px 30px; background: #ff6600; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;'>Retry</button>" +
            "<p style='margin-top: 30px; font-size: 14px; color: #999;'>Your current orders and earnings are available offline</p>" +
            "</div>" +
            "</body></html>";
        
        webView.loadDataWithBaseURL(null, offlineHtml, "text/html", "UTF-8", null);
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager = 
            (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }

    // LocationListener implementation
    @Override
    public void onLocationChanged(Location location) {
        if (location != null) {
            // Send location to Supabase for real-time tracking
            String driverId = sharedPreferences.getString(DRIVER_ID_KEY, "");
            if (!driverId.isEmpty()) {
                String authToken = sharedPreferences.getString(AUTH_TOKEN_KEY, "");
                if (!authToken.isEmpty()) {
                    // Update driver location in background
                    updateDriverLocation(location.getLatitude(), location.getLongitude(), driverId, authToken);
                }
            }
        }
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}

    private void updateDriverLocation(double latitude, double longitude, String driverId, String authToken) {
        if (supabaseClient != null) {
            supabaseClient.updateDriverLocation(driverId, latitude, longitude, authToken, new SupabaseClient.DataCallback() {
                @Override
                public void onSuccess(String data) {
                    android.util.Log.d("DriverLocation", "Location updated on server: " + data);
                }

                @Override
                public void onError(String error) {
                    android.util.Log.e("DriverLocation", "Failed to update location: " + error);
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        
        // Resume location updates
        if (locationManager != null) {
            try {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER, 5000, 10, this);
            } catch (SecurityException e) {
                android.util.Log.e("DriverApp", "Location permission denied", e);
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
        
        // Pause location updates to save battery
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
    }
    
    @Override
    protected void onDestroy() {
        if (supabaseBridge != null) {
            supabaseBridge.cleanup();
        }
        if (supabaseClient != null) {
            supabaseClient.shutdown();
        }
        if (webView != null) {
            webView.destroy();
        }
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
        super.onDestroy();
    }
    
    // Getter for WebView (used by SupabaseBridge)
    public WebView getWebView() {
        return webView;
    }
    
    // Handle deep links
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null) {
            handleDriverDeepLink(data.toString());
        }
    }
}
