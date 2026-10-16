# SmartSoko Driver — release minification rules
# (minify is currently disabled in build.gradle.kts; these rules make it
# safe to enable for release builds)

# ── Firebase ─────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.firebase.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.firebase.**

# Firestore auto-serialization of data/model classes (reflection on fields)
-keep class com.smartsoko.driver.data.model.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses,EnclosingMethod

# ── Google Play Services (auth / location) ───────────────────────────────
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.android.gms.auth.api.** { *; }
-keep class com.google.android.gms.location.** { *; }

# ── Coroutines ───────────────────────────────────────────────────────────
-keepclassmembers class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# ── Crash-safe stack traces ──────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
