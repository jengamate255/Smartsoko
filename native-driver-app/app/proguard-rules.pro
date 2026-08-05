# Hilt
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.android.HiltAndroidApp { *; }
-keep class * extends dagger.hilt.android.HiltApplication { *; }
-keep class * implements dagger.hilt.android.EntryPoint { *; }

# Room
-keep class androidx.room.** { *; }
-keep class * extends androidx.room.RoomDatabase { *; }

# Retrofit
-keep class retrofit2.** { *; }
-keep class com.squareup.okhttp3.** { *; }
-dontwarn retrofit2.**
-dontwarn okhttp3.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Google Play Services (Location)
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.**

# Mapbox
-keep class com.mapbox.mapboxsdk.** { *; }
-keep class com.mapbox.commons.** { *; }
-dontwarn com.mapbox.**

# Kotlin Coroutines
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# JSON
-keep class org.json.** { *; }

# Coil
-keep class coil.** { *; }
-dontwarn coil.**

# Gson
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

# Application classes
-keep class com.fooddelivery.driver.** { *; }
