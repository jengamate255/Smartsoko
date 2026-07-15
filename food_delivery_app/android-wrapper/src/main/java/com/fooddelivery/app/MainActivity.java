package com.fooddelivery.app;

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
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;
    private SupabaseBridge supabaseBridge;
    private SharedPreferences sharedPreferences;
    private static final String PREFS_NAME = "FoodDeliveryPrefs";
    private static final String LAST_URL_KEY = "last_url";
    private static final String BASE_URL = "https://fooddelievry-dce15.web.app";

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
        loadApp();
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
        webSettings.setUserAgentString(userAgent + " FoodDeliveryApp/1.0");

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
                
                // Save the last URL
                SharedPreferences.Editor editor = sharedPreferences.edit();
                editor.putString(LAST_URL_KEY, url);
                editor.apply();
                
                // Inject Supabase bridge JavaScript
                injectSupabaseBridge();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                
                // Show offline page or error message
                if (!isNetworkAvailable()) {
                    loadOfflinePage();
                } else {
                    Toast.makeText(MainActivity.this, "Error loading page", Toast.LENGTH_SHORT).show();
                }
            }
            
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Handle external URLs
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
                } else if (url.startsWith("http://") || url.startsWith("https://")) {
                    // Open external links in browser
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse(url));
                    startActivity(intent);
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
                // Log JavaScript console messages for debugging
                android.util.Log.d("WebViewConsole", consoleMessage.message() + 
                    " at " + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber());
                return true;
            }
        });
    }
    
    private void injectSupabaseBridge() {
        String javascript = "if (typeof window.AndroidBridge !== 'undefined') {" +
            "window.supabaseBridge = {" +
                "testConnection: function() { window.AndroidBridge.testConnection(); }," +
                "signIn: function(email, password) { window.AndroidBridge.signIn(email, password); }," +
                "signUp: function(email, password, name) { window.AndroidBridge.signUp(email, password, name); }," +
                "getRestaurants: function() { window.AndroidBridge.getRestaurants(); }," +
                "getMenuItems: function(restaurantId) { window.AndroidBridge.getMenuItems(restaurantId); }," +
                "createOrder: function(orderData, authToken) { window.AndroidBridge.createOrder(orderData, authToken); }," +
                "getOrders: function(userId, authToken) { window.AndroidBridge.getOrders(userId, authToken); }," +
                "subscribeToOrders: function(authToken) { window.AndroidBridge.subscribeToOrders(authToken); }," +
                "showToast: function(message) { window.AndroidBridge.showToast(message); }," +
                "shareApp: function(message) { window.AndroidBridge.shareApp(message); }," +
                "openMaps: function(address) { window.AndroidBridge.openMaps(address); }," +
                "callPhone: function(phoneNumber) { window.AndroidBridge.callPhone(phoneNumber); }," +
                "sendEmail: function(email) { window.AndroidBridge.sendEmail(email); }" +
            "};" +
            "window.supabaseBridgeCallback = function(method, status, data) {" +
                "console.log('Supabase Bridge Response:', method, status, data);" +
                "if (window.supabaseBridgeListeners && window.supabaseBridgeListeners[method]) {" +
                    "window.supabaseBridgeListeners[method](status, data);" +
                "}" +
            "};" +
            "console.log('Supabase Bridge initialized');" +
        "}";
        
        webView.evaluateJavascript(javascript, null);
    }

    private void loadApp() {
        // Try to load last saved URL first
        String lastUrl = sharedPreferences.getString(LAST_URL_KEY, null);
        
        if (lastUrl != null && !lastUrl.isEmpty()) {
            webView.loadUrl(lastUrl);
        } else if (isNetworkAvailable()) {
            // Load customer app from Firebase
            webView.loadUrl(BASE_URL + "/customer.html");
        } else {
            // Load offline version
            loadOfflinePage();
        }
    }
    
    private void loadOfflinePage() {
        String offlineHtml = "<!DOCTYPE html><html><head><title>Offline</title></head>" +
            "<body style='font-family: Arial; text-align: center; padding: 50px;'>" +
            "<h2>No Internet Connection</h2>" +
            "<p>Please check your internet connection and try again.</p>" +
            "<button onclick='location.reload()' style='padding: 10px 20px; background: #ff6600; color: white; border: none; border-radius: 5px;'>Retry</button>" +
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
    
    // Public getter for the bridge
    public WebView getWebView() {
        return webView;
    }
    
    // Handle deep links
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null) {
            String path = data.getPath();
            if (path != null) {
                // Handle deep link routing
                String url = "file:///android_asset/web" + path;
                webView.loadUrl(url);
            }
        }
    }
}
