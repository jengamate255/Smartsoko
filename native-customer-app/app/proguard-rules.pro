# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Keep annotations
-keepattributes *Annotation*
-keepattributes EnclosingMethod

# Keep classes for serialization
-keep class * implements java.io.Serializable {
    *;
}

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
    *;
}

# Keep Enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Room entities and DAOs
-keep class com.smartsoko.customer.data.local.entity.** { *; }
-keep class com.smartsoko.customer.data.local.dao.** { *; }
-keep class com.smartsoko.customer.data.local.database.** { *; }

# Keep Hilt generated classes
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.android.HiltAndroidApp { *; }
-keep class * extends dagger.hilt.android.HiltActivity { *; }
-keep class * extends dagger.hilt.android.HiltFragment { *; }
-keep class * extends dagger.hilt.android.HiltViewModel { *; }

# Keep Dagger generated classes
-keep class * extends dagger.hilt.android.Hilt_* { *; }
-keep class * extends dagger.Module { *; }

# Keep Kotlin metadata
-keep class kotlin.Metadata { *; }

# Keep Coroutines
-keepclassmembers class kotlinx.coroutines.** { *; }

# Keep Moshi
-keep class com.squareup.moshi.** { *; }
-dontwarn com.squareup.moshi.**

# Keep Retrofit
-keep class retrofit2.** { *; }
-dontwarn retrofit2.**

# Keep OkHttp
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**

# Keep Coil
-keep class coil3.** { *; }
-dontwarn coil3.**

# Keep Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep Mapbox
-keep class com.mapbox.** { *; }
-dontwarn com.mapbox.**

# Keep Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# Keep Material3
-keep class androidx.compose.material3.** { *; }
-dontwarn androidx.compose.material3.**

# Keep Accompanist
-keep class com.google.accompanist.** { *; }
-dontwarn com.google.accompanist.**

# Keep Security Crypto
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**

# Keep WorkManager
-keep class androidx.work.** { *; }
-dontwarn androidx.work.**

# Keep Navigation
-keep class androidx.navigation.** { *; }
-dontwarn androidx.navigation.**

# Keep Lifecycle
-keep class androidx.lifecycle.** { *; }
-dontwarn androidx.lifecycle.**

# Keep Room
-keep class androidx.room.** { *; }
-dontwarn androidx.room.**

# Keep Paging
-keep class androidx.paging.** { *; }
-dontwarn androidx.paging.**

# Keep Hilt Navigation
-keep class androidx.hilt.navigation.** { *; }
-dontwarn androidx.hilt.navigation.**

# Keep coroutines
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Keep serialization
-keep class kotlinx.serialization.** { *; }
-dontwarn kotlinx.serialization.**

# Keep Joda Time
-keep class org.joda.time.** { *; }
-dontwarn org.joda.time.**

# Optimization rules
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
}

# Remove debug assertions
-assumenosideeffects class java.lang.System {
    public static void setProperty(java.lang.String, java.lang.String);
}

# Keep source file and line number info for debugging
-keepattributes SourceFile,LineNumberTable

# Keep generics signature
-keepattributes Signature

# Keep inner classes
-keepattributes InnerClasses

# Keep deprecated warnings
-dontwarn java.lang.ClassValue