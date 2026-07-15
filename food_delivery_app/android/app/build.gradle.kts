plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.fooddelivery.food_delivery_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "27.0.12077973"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
        freeCompilerArgs += listOf(
            "-Xincremental=false",
            "-no-reflect",
            "-Xskip-metadata-version-check"
        )
    }

    defaultConfig {
        applicationId = "com.fooddelivery.food_delivery_app"
        minSdk = 24
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    flavorDimensions += "app"
    
    productFlavors {
        create("customer") {
            dimension = "app"
            applicationId = "com.fooddelivery.customer"
            versionCode = 1
            versionName = "1.0.0"
            resValue("string", "app_name", "Food Delivery - Customer")
        }
        
        create("driver") {
            dimension = "app"
            applicationId = "com.fooddelivery.driver"
            versionCode = 1
            versionName = "1.0.0"
            resValue("string", "app_name", "Food Delivery - Driver")
        }
        
        create("merchant") {
            dimension = "app"
            applicationId = "com.fooddelivery.merchant"
            versionCode = 1
            versionName = "1.0.0"
            resValue("string", "app_name", "Food Delivery - Merchant")
        }
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")
}

flutter {
    source = "../.."
}

// Configure flavor-specific Dart entry points
android.applicationVariants.all {
    val flavorName = this.flavorName
    when (flavorName) {
        "customer" -> {
            outputs.all {
                val output = this
                output.processResourcesProvider.get().doFirst {
                    project.extra.set("flutterTarget", "lib/main_customer.dart")
                }
            }
        }
        "driver" -> {
            outputs.all {
                val output = this
                output.processResourcesProvider.get().doFirst {
                    project.extra.set("flutterTarget", "lib/main_driver.dart")
                }
            }
        }
        "merchant" -> {
            outputs.all {
                val output = this
                output.processResourcesProvider.get().doFirst {
                    project.extra.set("flutterTarget", "lib/main_merchant.dart")
                }
            }
        }
    }
}
