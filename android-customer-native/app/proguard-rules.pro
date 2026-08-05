-keepattributes Signature
-keepattributes *Annotation*
-keep class com.smartsoko.customer.data.remote.dto.** { *; }
-keep class com.smartsoko.customer.domain.model.** { *; }
# Mapbox Maps SDK v11
-keep class com.mapbox.maps.** { *; }
-keep class com.mapbox.geojson.** { *; }
-dontwarn com.mapbox.**
