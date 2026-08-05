package com.smartsoko.admin

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SmartSokoAdminApp : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
