package com.fooddelivery.driver

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SmartSokoDriverApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize any app-wide components here
    }
}