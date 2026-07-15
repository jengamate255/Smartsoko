package com.smartsoko.driver.ui.components

import android.graphics.Color
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.MapView
import com.mapbox.maps.MapboxMap
import com.mapbox.maps.Style.Companion.MAPBOX_STREETS
import com.mapbox.maps.plugin.annotation.annotations
import com.mapbox.maps.plugin.annotation.generated.PointAnnotationOptions
import com.mapbox.maps.plugin.annotation.generated.createPointAnnotationManager
import com.smartsoko.driver.domain.model.Location

@Composable
fun DriverMap(
    driverLocation: Location?,
    pickupLocation: Pair<Double, Double>? = null,
    dropoffLocation: Pair<Double, Double>? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val mapView = remember { MapView(context) }

    DisposableEffect(Unit) {
        val map = mapView.mapboxMap
        map.loadStyleUri(MAPBOX_STREETS) {
            val annotationManager = mapView.annotations.createPointAnnotationManager()
            driverLocation?.let { loc ->
                annotationManager.create(
                    PointAnnotationOptions().withPoint(Point.fromLngLat(loc.lng, loc.lat))
                )
                map.setCamera(
                    CameraOptions.Builder().center(Point.fromLngLat(loc.lng, loc.lat)).zoom(14.0).build()
                )
            }
            pickupLocation?.let { (lat, lng) ->
                annotationManager.create(
                    PointAnnotationOptions().withPoint(Point.fromLngLat(lng, lat))
                )
            }
            dropoffLocation?.let { (lat, lng) ->
                annotationManager.create(
                    PointAnnotationOptions().withPoint(Point.fromLngLat(lng, lat))
                )
            }
        }
        onDispose { mapView.onDestroy() }
    }

    AndroidView(factory = { mapView }, modifier = modifier)
}
