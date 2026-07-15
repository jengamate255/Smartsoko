plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
    id("kotlin-kapt")
    id("kotlin-parcelize")
}

android {
    namespace = "com.smartsoko.customer"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.smartsoko.customer"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
        multiDexEnabled = true
    }

    signingConfigs {
        create("release") {
            storeFile = file("../keystore/release.keystore")
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "keystore_password"
            keyAlias = System.getenv("KEY_ALIAS") ?: "smartsoko_key"
            keyPassword = System.getenv("KEY_PASSWORD") ?: "key_password"
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
            isMinifyEnabled = false
            isShrinkResources = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            matchingFallbacks = ["release"]
            
            // Enable Firebase Crashlytics for debug
            buildConfigField("boolean", "ENABLE_CRASHLYTICS", "false")
        }
        
        release {
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
            buildConfigField("boolean", "ENABLE_CRASHLYTICS", "true")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += [
            "-Xopt-in=kotlin.RequiresOptIn",
            "-Xopt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
            "-Xopt-in=androidx.compose.material3.ExperimentalMaterial3Api",
            "-Xopt-in=androidx.compose.animation.ExperimentalAnimationApi",
            "-Xopt-in=androidx.compose.foundation.ExperimentalFoundationApi",
            "-Xopt-in=androidx.lifecycle.ExperimentalLifecycleApi"
        ]
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.3"
    }

    packagingOptions {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1,LICENSE,LICENSE.txt,NOTICE,NOTICE.txt}"
        }
        jniLibs {
            pickFirsts += "libc++_shared.so"
        }
    }

    buildFeatures {
        compose = true
        viewBinding = true
        dataBinding = true
        buildConfig = true
    }

    // Room database
    kapt {
        correctErrorTypes = true
        javacOptions {
            option("-Xlint:unchecked")
        }
    }

    // Java 17 support for Room
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
}

dependencies {
    // Core Android
    val core_ktx_version = "1.12.0"
    val appcompat_version = "1.6.1"
    val activity_version = "1.8.2"
    val fragment_version = "1.6.2"
    val lifecycle_version = "2.7.0"
    val room_version = "2.6.1"
    val work_version = "2.9.0"
    val navigation_version = "2.7.6"
    val paging_version = "3.2.1"
    
    // Material 3 & Compose
    val compose_bom_version = "2023.10.01"
    val compose_ui_version = "1.5.4"
    val material3_version = "1.2.1"
    val material_icons_version = "1.2.1"
    
    // Coroutines & Flow
    val coroutines_version = "1.7.3"
    
    // Retrofit & Networking
    val retrofit_version = "2.9.0"
    val okhttp_version = "4.12.0"
    val moshi_version = "1.15.1"
    
    // Firebase
    val firebase_bom_version = "32.7.1"
    val firebase_messaging_version = "23.4.1"
    val firebase_crashlytics_version = "18.6.1"
    val firebase_analytics_version = "21.5.1"
    val firebase_auth_version = "22.3.1"
    val firebase_firestore_version = "24.10.1"
    val firebase_database_version = "20.3.1"
    
    // Mapbox
    val mapbox_navigation_version = "2.17.0"
    val mapbox_maps_version = "11.3.0"
    val mapbox_turf_version = "7.2.0"
    
    // Image Loading
    val coil_version = "2.5.0"
    
    // Dependency Injection
    val hilt_version = "2.48"
    
    // Security
    val security_crypto_version = "1.1.0-alpha06"
    
    // Testing
    val junit_version = "4.13.2"
    val espresso_version = "3.5.1"
    val compose_test_version = "1.5.4"
    val truth_version = "1.1.5"
    val mockk_version = "1.13.13"
    val robolectric_version = "4.11"
    
    // ==================== CORE ANDROID ====================
    implementation("androidx.core:core-ktx:$core_ktx_version")
    implementation("androidx.appcompat:appcompat:$appcompat_version")
    implementation("androidx.activity:activity-compose:$activity_version")
    implementation("androidx.fragment:fragment-ktx:$fragment_version")
    
    // Lifecycle & ViewModel
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:$lifecycle_version")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:$lifecycle_version")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:$lifecycle_version")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:$lifecycle_version")
    
    // Room Database
    implementation("androidx.room:room-runtime:$room_version")
    implementation("androidx.room:room-ktx:$room_version")
    implementation("androidx.room:room-paging:$room_version")
    kapt("androidx.room:room-compiler:$room_version")
    
    // WorkManager
    implementation("androidx.work:work-runtime-ktx:$work_version")
    
    // Navigation Compose
    implementation("androidx.navigation:navigation-compose:$navigation_version")
    implementation("androidx.navigation:navigation-fragment-ktx:$navigation_version")
    implementation("androidx.navigation:navigation-ui-ktx:$navigation_version")
    
    // Paging
    implementation("androidx.paging:paging-compose:$paging_version")
    implementation("androidx.paging:paging-runtime-ktx:$paging_version")
    
    // ==================== COMPOSE & MATERIAL 3 ====================
    implementation(platform("androidx.compose:compose-bom:$compose_bom_version"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.ui:ui-util")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material3:material3-window-size-class")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.compose.animation:animation-graphics")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.foundation:foundation-layout")
    implementation("androidx.compose.runtime:runtime")
    implementation("androidx.compose.runtime:runtime-livedata")
    implementation("androidx.compose.runtime:runtime-rxjava3")
    
    // Compose Tooling (for development)
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-tooling-data")
    
    // ==================== COROUTINES & FLOW ====================
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:$coroutines_version")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:$coroutines_version")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:$coroutines_version")
    
    // ==================== RETROFIT & NETWORKING ====================
    implementation("com.squareup.retrofit2:retrofit:$retrofit_version")
    implementation("com.squareup.retrofit2:converter-moshi:$retrofit_version")
    implementation("com.squareup.retrofit2:adapter-rxjava3:$retrofit_version")
    implementation("com.squareup.okhttp3:okhttp:$okhttp_version")
    implementation("com.squareup.okhttp3:logging-interceptor:$okhttp_version")
    implementation("com.squareup.moshi:moshi-kotlin:$moshi_version")
    implementation("com.squareup.moshi:moshi-adapters:$moshi_version")
    
    // ==================== FIREBASE ====================
    implementation(platform("com.google.firebase:firebase-bom:$firebase_bom_version"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.google.firebase:firebase-crashlytics-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-database-ktx")
    implementation("com.google.firebase:firebase-config-ktx")
    implementation("com.google.firebase:firebase-perf-ktx")
    
    // ==================== MAPBOX ====================
    implementation("com.mapbox.navigation:navigation-compose:$mapbox_navigation_version")
    implementation("com.mapbox.maps:android:$mapbox_maps_version")
    implementation("com.mapbox.turf:turf:$mapbox_turf_version")
    
    // ==================== IMAGE LOADING (COIL) ====================
    implementation("io.coil-kt:coil-compose:$coil_version")
    implementation("io.coil-kt:coil-network-okhttp:$coil_version")
    
    // ==================== DEPENDENCY INJECTION (HILT) ====================
    implementation("com.google.dagger:hilt-android:$hilt_version")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")
    kapt("com.google.dagger:hilt-compiler:$hilt_version")
    kapt("androidx.hilt:hilt-compiler:1.2.0")
    
    // ==================== SECURITY (ENCRYPTED SHAREDPREFS) ====================
    implementation("androidx.security:security-crypto:$security_crypto_version")
    implementation("androidx.security:security-identity-credential:$security_crypto_version")
    
    // ==================== UTILITY LIBRARIES ====================
    // Permissions
    implementation("com.google.accompanist:accompanist-permissions:0.30.1")
    
    // System UI Controller (Edge-to-edge)
    implementation("com.google.accompanist:accompanist-systemuicontroller:0.30.1")
    
    // Inset Handling
    implementation("com.google.accompanist:accompanist-insets:0.30.1")
    
    // Date/Time
    implementation("org.joda:joda-time:2.12.7")
    
    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.1")
    
    // ==================== TESTING ====================
    testImplementation("junit:junit:$junit_version")
    testImplementation("org.mockito:mockito-core:5.10.0")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.1.0")
    testImplementation("io.mockk:mockk:$mockk_version")
    testImplementation("com.google.truth:truth:$truth_version")
    testImplementation("org.robolectric:robolectric:$robolectric_version")
    
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:$espresso_version")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:$compose_test_version")
    androidTestImplementation("androidx.compose.ui:ui-test-manifest:$compose_test_version")
    debugImplementation("androidx.compose.ui:ui-tooling:$compose_ui_version")
    debugImplementation("androidx.compose.ui:ui-tooling-data:$compose_ui_version")
}

kapt {
    correctErrorTypes = true
    javacOptions {
        option("-Xlint:unchecked")
        option("-Xlint:deprecation")
    }
}

// Hilt configuration
tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
        freeCompilerArgs += [
            "-Xopt-in=kotlin.RequiresOptIn",
            "-Xopt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
            "-Xopt-in=androidx.compose.material3.ExperimentalMaterial3Api",
            "-Xopt-in=androidx.compose.animation.ExperimentalAnimationApi",
            "-Xopt-in=androidx.compose.foundation.ExperimentalFoundationApi"
        ]
    }
}