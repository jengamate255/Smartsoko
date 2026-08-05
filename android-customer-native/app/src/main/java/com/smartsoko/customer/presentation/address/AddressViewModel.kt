package com.smartsoko.customer.presentation.address

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.smartsoko.customer.BuildConfig
import com.smartsoko.customer.domain.model.Address
import com.smartsoko.customer.domain.model.Location
import com.smartsoko.customer.domain.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import javax.inject.Inject

data class AddressUiState(
    val isLoading: Boolean = true,
    val addresses: List<Address> = emptyList(),
    val error: String? = null,
    val navigateBack: Boolean = false
)

data class AddressFormUiState(
    val isLoading: Boolean = false,
    val title: String = "",
    val fullName: String = "",
    val phoneNumber: String = "",
    val streetAddress: String = "",
    val apartment: String = "",
    val city: String = "",
    val postalCode: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val isLocating: Boolean = false,
    val isDefault: Boolean = false,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class AddressViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddressUiState())
    val uiState: StateFlow<AddressUiState> = _uiState.asStateFlow()

    private val _formState = MutableStateFlow(AddressFormUiState())
    val formState: StateFlow<AddressFormUiState> = _formState.asStateFlow()

    private var editAddressId: String? = null
    private var lastGeocodedKey: String? = null
    private var manualStreetEdit = false
    private var manualCityEdit = false

    init {
        loadAddresses()
    }

    private fun loadAddresses() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                userRepository.getUserProfile().first().let { profile ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            addresses = profile?.addresses ?: emptyList()
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun reload() {
        loadAddresses()
    }

    fun loadAddressForEdit(addressId: String) {
        editAddressId = addressId
        viewModelScope.launch {
            val address = _uiState.value.addresses.firstOrNull { it.id == addressId }
            if (address != null) {
                _formState.update {
                    it.copy(
                        title = address.title,
                        fullName = address.fullName,
                        phoneNumber = address.phoneNumber,
                        streetAddress = address.streetAddress,
                        apartment = address.apartment ?: "",
                        city = address.city,
                        postalCode = address.postalCode ?: "",
                        latitude = address.location.latitude,
                        longitude = address.location.longitude,
                        isDefault = address.isDefault
                    )
                }
            }
        }
    }

    fun updateFormField(
        title: String? = null,
        fullName: String? = null,
        phoneNumber: String? = null,
        streetAddress: String? = null,
        apartment: String? = null,
        city: String? = null,
        postalCode: String? = null,
        isDefault: Boolean? = null
    ) {
        if (streetAddress != null) manualStreetEdit = true
        if (city != null) manualCityEdit = true
        _formState.update {
            it.copy(
                title = title ?: it.title,
                fullName = fullName ?: it.fullName,
                phoneNumber = phoneNumber ?: it.phoneNumber,
                streetAddress = streetAddress ?: it.streetAddress,
                apartment = apartment ?: it.apartment,
                city = city ?: it.city,
                postalCode = postalCode ?: it.postalCode,
                isDefault = isDefault ?: it.isDefault
            )
        }
    }

    fun updateLocation(latitude: Double, longitude: Double) {
        _formState.update {
            it.copy(latitude = latitude, longitude = longitude, isLocating = false)
        }
        reverseGeocode(latitude, longitude)
    }

    fun setLocating() {
        _formState.update { it.copy(isLocating = true) }
    }

    private fun reverseGeocode(latitude: Double, longitude: Double) {
        val key = "$latitude,$longitude"
        if (key == lastGeocodedKey) return
        lastGeocodedKey = key
        viewModelScope.launch {
            val result = withContext(Dispatchers.IO) {
                val detail = try {
                    val url = URL(
                        "https://api.mapbox.com/search/geocode/v6/reverse" +
                            "?longitude=$longitude&latitude=$latitude" +
                            "&access_token=${BuildConfig.MAPBOX_TOKEN}&limit=1" +
                            "&types=address,neighborhood,locality,place,district,region,country,postcode"
                    )
                    val connection = url.openConnection() as HttpURLConnection
                    connection.connectTimeout = 10000
                    connection.readTimeout = 10000
                    connection.requestMethod = "GET"
                    if (connection.responseCode == 200) {
                        val reader = BufferedReader(InputStreamReader(connection.inputStream))
                        val response = reader.readText()
                        reader.close()
                        connection.disconnect()
                        parseGeocodeDetail(response)
                    } else {
                        connection.disconnect()
                        null
                    }
                } catch (e: Exception) {
                    Log.e("AddressViewModel", "Reverse geocode failed", e)
                    null
                }
                val fallbackPostcode =
                    if (detail?.postalCode.isNullOrBlank()) lookupPostalCode(latitude, longitude) else null
                detail to fallbackPostcode
            } ?: return@launch

            val detail = result.first ?: return@launch
            val fallbackPostcode = result.second
            val current = _formState.value
            _formState.update {
                it.copy(
                    streetAddress = if (!manualStreetEdit) buildStreetAddress(detail) else it.streetAddress,
                    city = if (!manualCityEdit) (detail.city ?: detail.neighborhood ?: detail.region ?: "") else it.city,
                    postalCode = if (it.postalCode.isBlank())
                        (detail.postalCode ?: fallbackPostcode).orEmpty()
                    else
                        it.postalCode
                )
            }
        }
    }

    private fun lookupPostalCode(latitude: Double, longitude: Double): String? {
        return try {
            val url = URL(
                "https://nominatim.openstreetmap.org/reverse" +
                    "?format=jsonv2&lat=$latitude&lon=$longitude&zoom=18&addressdetails=1"
            )
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.requestMethod = "GET"
            connection.setRequestProperty(
                "User-Agent",
                "SmartSokoCustomerApp/1.0 (https://smartsoko.com)"
            )
            if (connection.responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()
                connection.disconnect()
                val root = JsonParser().parse(response).asJsonObject
                val address = root.getAsJsonObject("address") ?: return null
                val pc = address.get("postcode")
                pc?.takeIf { it.isJsonPrimitive }?.asString?.takeIf { it.isNotBlank() }
            } else {
                connection.disconnect()
                null
            }
        } catch (e: Exception) {
            Log.e("AddressViewModel", "Nominatim postcode lookup failed", e)
            null
        }
    }

    private data class GeocodeDetail(
        val street: String?,
        val neighborhood: String?,
        val city: String?,
        val region: String?,
        val country: String?,
        val postalCode: String?,
        val fullAddress: String?,
        val placeName: String?
    )

    private fun buildStreetAddress(d: GeocodeDetail): String {
        val specific = listOfNotNull(d.street, d.neighborhood)
            .filter { it.isNotBlank() }
            .joinToString(", ")
        if (specific.isNotBlank()) return specific
        return d.fullAddress ?: d.placeName ?: ""
    }

    private fun parseGeocodeDetail(response: String): GeocodeDetail? {
        return try {
            val root = JsonParser().parse(response).asJsonObject
            val features = root.getAsJsonArray("features")
            if (features.size() == 0) return null
            val props = features[0].asJsonObject.getAsJsonObject("properties") ?: return null

            fun name(obj: JsonObject?, key: String): String? {
                val v = obj?.get(key) ?: return null
                return when {
                    v.isJsonPrimitive -> v.asString.takeIf { it.isNotBlank() }
                    v.isJsonObject -> {
                        val n = v.asJsonObject.get("name")
                        if (n != null && n.isJsonPrimitive) n.asString.takeIf { it.isNotBlank() } else null
                    }
                    else -> null
                }
            }

            val context = props.getAsJsonObject("context")
            val addressObj = props.getAsJsonObject("address")
            val number = addressObj?.get("number")?.takeIf { it.isJsonPrimitive }?.asString
            val streetName = addressObj?.get("street")?.takeIf { it.isJsonPrimitive }?.asString
            val street = listOf(number, streetName)
                .filter { !it.isNullOrBlank() }
                .joinToString(" ")
                .ifBlank { null }

            val locality = name(context, "locality") ?: name(props, "locality")
            val neighborhood = name(context, "neighborhood") ?: name(props, "neighborhood")
            val district = name(context, "district") ?: name(props, "district")
            val place = name(context, "place") ?: name(props, "place")
            val region = name(context, "region") ?: name(props, "region")
            val country = name(context, "country") ?: name(props, "country")
            val postcode = name(context, "postcode") ?: name(props, "postcode")

            val fullAddress = props.get("full_address")?.takeIf { it.isJsonPrimitive }?.asString
            val placeFormatted = props.get("place_formatted")?.takeIf { it.isJsonPrimitive }?.asString
            val featureName = props.get("name")?.takeIf { it.isJsonPrimitive }?.asString

            GeocodeDetail(
                street = street,
                neighborhood = neighborhood,
                city = place ?: district ?: locality,
                region = region,
                country = country,
                postalCode = postcode,
                fullAddress = fullAddress,
                placeName = featureName ?: placeFormatted
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun forwardGeocode(query: String): Pair<Double, Double>? {
        return try {
            val q = java.net.URLEncoder.encode(query, "UTF-8")
            val url = URL(
                "https://api.mapbox.com/geocoding/v5/mapbox.places/$q.json" +
                    "?access_token=${BuildConfig.MAPBOX_TOKEN}&limit=1"
            )
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.requestMethod = "GET"
            if (connection.responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()
                connection.disconnect()
                val root = JsonParser().parse(response).asJsonObject
                val features = root.getAsJsonArray("features")
                if (features.size() == 0) return null
                val center = features[0].asJsonObject.getAsJsonArray("center") ?: return null
                if (center.size() < 2) return null
                center[1].asDouble to center[0].asDouble
            } else {
                connection.disconnect()
                null
            }
        } catch (e: Exception) {
            Log.e("AddressViewModel", "Forward geocode failed", e)
            null
        }
    }

    fun saveAddress() {
        val form = _formState.value
        if (form.streetAddress.isBlank() || form.city.isBlank() || form.fullName.isBlank()) {
            _formState.update { it.copy(error = "Please fill in required fields") }
            return
        }

        viewModelScope.launch {
            _formState.update { it.copy(isSaving = true, error = null) }

            val addressText = listOfNotNull(
                form.streetAddress.takeIf { it.isNotBlank() },
                form.apartment.takeIf { it.isNotBlank() },
                form.city.takeIf { it.isNotBlank() }
            ).joinToString(", ")

            // Fallback: if the user only typed the address (never touched the map),
            // resolve coordinates from the written address so the driver gets a
            // precise GPS point. Otherwise keep the on-map coordinates.
            var latitude = form.latitude
            var longitude = form.longitude
            if (latitude == 0.0 && longitude == 0.0) {
                val resolved = withContext(Dispatchers.IO) {
                    forwardGeocode(addressText)
                }
                if (resolved != null) {
                    latitude = resolved.first
                    longitude = resolved.second
                    _formState.update { it.copy(latitude = latitude, longitude = longitude) }
                }
            }

            val address = Address(
                id = editAddressId ?: UUID.randomUUID().toString(),
                userId = "",
                title = form.title.ifBlank { "Other" },
                fullName = form.fullName,
                phoneNumber = form.phoneNumber,
                streetAddress = form.streetAddress,
                apartment = form.apartment.ifBlank { null },
                city = form.city,
                postalCode = form.postalCode.ifBlank { null },
                location = Location(latitude, longitude, addressText),
                isDefault = form.isDefault,
                deliveryInstructions = null
            )

            val result = if (editAddressId != null) {
                userRepository.updateAddress(address)
            } else {
                userRepository.addAddress(address)
            }

            result.fold(
                onSuccess = {
                    loadAddresses()
                    _formState.update { it.copy(isSaving = false, saveSuccess = true) }
                },
                onFailure = { e ->
                    _formState.update { it.copy(isSaving = false, error = e.message) }
                }
            )
        }
    }

    fun deleteAddress(addressId: String) {
        viewModelScope.launch {
            userRepository.deleteAddress(addressId)
            loadAddresses()
        }
    }

    fun setDefaultAddress(addressId: String) {
        viewModelScope.launch {
            userRepository.setDefaultAddress(addressId)
            loadAddresses()
        }
    }

    fun clearNavigation() {
        _uiState.update { it.copy(navigateBack = false) }
        _formState.update { it.copy(saveSuccess = false) }
    }
}
