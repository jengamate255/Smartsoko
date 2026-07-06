package com.smartsoko.merchant

import android.app.Application
import com.google.firebase.FirebaseApp

class MerchantApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
