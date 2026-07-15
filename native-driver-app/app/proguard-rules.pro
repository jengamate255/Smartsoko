# SmartSoko Driver ProGuard Rules
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-keep class com.smartsoko.driver.data.remote.dto.** { *; }

