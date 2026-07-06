package com.smartsoko.merchant;

import android.app.Application;

import com.google.firebase.FirebaseApp;

public class MerchantApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        FirebaseApp.initializeApp(this);
    }
}
