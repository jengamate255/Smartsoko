package com.smartsoko.customer

import android.app.Application
import com.google.firebase.FirebaseApp

class CustomerApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
