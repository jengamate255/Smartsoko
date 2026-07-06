plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.dagger.hilt.android")
    id("kotlin-kapt")
    id("com.google.gms.google-services")
}

android {
    compileSdk = 34

    defaultConfig {
        applicationId = "com.fooddelivery.driver"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
        viewBinding = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    
    packagingOptions {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
    implementation("androidx.activity:activity-compose:1.7.2")
    implementation("androidx.compose.ui:ui:1.6.4")
    implementation("androidx.compose.ui:ui-graphics:1.6.4")
    implementation("androidx.compose.ui:ui-text:1.6.4")
    implementation("androidx.compose.ui:ui-tooling-preview:1.6.4")
    implementation("androidx.compose.material3:material3:1.2.1")
    implementation("androidx.compose.material3:material3-window-size-class:1.2.1")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.5")
    
    // Hilt for dependency injection
    implementation("com.google.dagger:hilt-android:2.48")
    kapt("com.google.dagger:hilt-compiler:2.48")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Room Database
    implementation("androidx.room:room-runtime:2.5.2")
    kapt("androidx.room:room-compiler:2.5.2")
    implementation("androidx.room:room-ktx:2.5.2")
    
    // DataStore for preferences
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    
    // Coil for image loading
    implementation("io.coil-kt:coil-compose:2.5.0")
    
    // Accompanist for system UI controller
    implementation("com.google.accompanist:accompanist-systemuicontrol:0.32.0-alpha")
    
    // Timber for logging
    implementation("com.jakewharton.timber:timber:5.0.1")
    
    // Firebase Cloud Messaging
    implementation(platform("com.google.firebase:firebase-bom:32.3.1"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    
    // Mapbox Maps SDK
    implementation("com.mapbox.maps:android:11.0.0")

    // WebSocket client (uses OkHttp, already a dependency)
    // Note: server uses native WebSocket protocol, not Socket.IO
    
    // For now, we'll use direct HTTP calls to Supabase since we're limiting usage
    // In a real app, you'd use their official Java client
    
    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.6.4")
    debugImplementation("androidx.compose.ui:ui-tooling:1.6.4")
    debugImplementation("androidx.compose.ui:ui-test-manifest:1.6.4")
}