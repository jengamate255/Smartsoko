package com.smartsoko.driver

import android.app.Application
import com.google.firebase.FirebaseApp

class DriverApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
