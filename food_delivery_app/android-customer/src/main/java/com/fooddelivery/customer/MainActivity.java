package com.fooddelivery.customer;

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
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;
    private SupabaseBridge supabaseBridge;
    private SharedPreferences sharedPreferences;
    private static final String PREFS_NAME = "CustomerPrefs";
    private static final String LAST_URL_KEY = "last_url";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progressBar);
        sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        // Initialize Supabase bridge
        supabaseBridge = new SupabaseBridge(this);

        setupWebView();
        loadCustomerApp();
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
        webSettings.setUserAgentString(userAgent + " FoodDeliveryCustomer/1.0");

        // Add JavaScript interface for Supabase communication
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
                
                // Inject customer-specific bridge
                injectCustomerBridge();
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
                // Handle customer-specific URLs
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
                    handleDeepLink(url);
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
                android.util.Log.d("CustomerWebView", consoleMessage.message() + 
                    " at " + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber());
                return true;
            }
        });
    }
    
    private void injectCustomerBridge() {
        String javascript = "if (typeof window.AndroidBridge !== 'undefined') {" +
            "window.customerApp = {" +
                "getRestaurants: function() { window.AndroidBridge.getRestaurants(); }," +
                "getMenuItems: function(restaurantId) { window.AndroidBridge.getMenuItems(restaurantId); }," +
                "createOrder: function(orderData, authToken) { window.AndroidBridge.createOrder(orderData, authToken); }," +
                "getOrders: function(userId, authToken) { window.AndroidBridge.getOrders(userId, authToken); }," +
                "updateProfile: function(profileData, authToken) { window.AndroidBridge.updateProfile(profileData, authToken); }," +
                "trackOrder: function(orderId, authToken) { window.AndroidBridge.trackOrder(orderId, authToken); }," +
                "applyPromoCode: function(code, authToken) { window.AndroidBridge.applyPromoCode(code, authToken); }," +
                "showToast: function(message) { window.AndroidBridge.showToast(message); }," +
                "shareApp: function(message) { window.AndroidBridge.shareApp(message); }," +
                "openMaps: function(address) { window.AndroidBridge.openMaps(address); }," +
                "callRestaurant: function(phone) { window.AndroidBridge.callPhone(phone); }," +
                "rateOrder: function(orderId, rating, review, authToken) { window.AndroidBridge.rateOrder(orderId, rating, review, authToken); }" +
            "};" +
            "window.customerBridgeCallback = function(method, status, data) {" +
                "console.log('Customer Bridge Response:', method, status, data);" +
                "if (window.customerListeners && window.customerListeners[method]) {" +
                    "window.customerListeners[method](status, data);" +
                "}" +
            "};" +
            "console.log('Customer Bridge initialized');" +
        "}";
        
        webView.evaluateJavascript(javascript, null);
    }

    private void loadCustomerApp() {
        String lastUrl = sharedPreferences.getString(LAST_URL_KEY, null);
        
        if (lastUrl != null && !lastUrl.isEmpty()) {
            webView.loadUrl(lastUrl);
        } else if (isNetworkAvailable()) {
            // Load customer app
            webView.loadUrl("https://smartsoko-marketplace.vercel.app/customer.html");
        } else {
            loadOfflinePage();
        }
    }
    
    private void handleDeepLink(String url) {
        Uri uri = Uri.parse(url);
        String path = uri.getPath();
        
        if (path != null) {
            if (path.equals("/restaurant")) {
                String restaurantId = uri.getQueryParameter("id");
                if (restaurantId != null) {
                    webView.loadUrl("https://smartsoko-marketplace.vercel.app/customer.html?restaurant=" + restaurantId);
                }
            } else if (path.equals("/order")) {
                String orderId = uri.getQueryParameter("id");
                if (orderId != null) {
                    webView.loadUrl("https://smartsoko-marketplace.vercel.app/customer.html?order=" + orderId);
                }
            }
        }
    }
    
    private void loadOfflinePage() {
        String offlineHtml = "<!DOCTYPE html><html><head><title>Food Delivery - Offline</title></head>" +
            "<body style='font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;'>" +
            "<div style='max-width: 400px; margin: 0 auto;'>" +
            "<h2 style='color: #ff6600;'>🍔 No Internet Connection</h2>" +
            "<p style='color: #666;'>Please check your internet connection and try again.</p>" +
            "<button onclick='location.reload()' style='padding: 15px 30px; background: #ff6600; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;'>Retry</button>" +
            "<p style='margin-top: 30px; font-size: 14px; color: #999;'>Your recent orders and favorites are available offline</p>" +
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
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }
    
    @Override
    protected void onDestroy() {
        if (supabaseBridge != null) {
            supabaseBridge.cleanup();
        }
        if (webView != null) {
            webView.destroy();
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
            handleDeepLink(data.toString());
        }
    }
}
