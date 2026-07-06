# SmartSoko Merchant ProGuard Rules
-keepattributes Signature
-keepattributes *Annotation*

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-dontwarn kotlinx.coroutines.**

# Coil
-dontwarn coil.**
