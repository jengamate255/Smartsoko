package com.smartsoko.merchant.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.smartsoko.merchant.data.model.AiExtraction
import com.smartsoko.merchant.data.model.Product
import com.smartsoko.merchant.ui.components.*
import kotlinx.coroutines.launch

private val CATEGORIES = listOf(
    "Fresh Produce", "Meat & Poultry", "Fish & Seafood", "Dairy & Eggs",
    "Bakery", "Beverages", "Snacks", "Grains & Cereals", "Spices & Condiments",
    "Frozen Foods", "Prepared Meals", "Household Items"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProductScreen(
    product: Product,
    isLoading: Boolean,
    onBack: () -> Unit,
    onAiAssist: (Uri, (AiExtraction) -> Unit, (String) -> Unit) -> Unit,
    onSave: (
        productId: String,
        name: String,
        description: String,
        price: Double,
        originalPrice: Double?,
        category: String,
        unit: String,
        stockQuantity: Int,
        featured: Boolean,
        imageUri: Uri?
    ) -> Unit
) {
    var name by remember(product) { mutableStateOf(product.name) }
    var description by remember(product) { mutableStateOf(product.description) }
    var price by remember(product) { mutableStateOf(product.price.toString()) }
    var originalPrice by remember(product) { mutableStateOf(product.originalPrice?.toString() ?: "") }
    var category by remember(product) { mutableStateOf(product.category) }
    var unit by remember(product) { mutableStateOf(product.unit) }
    var stockQuantity by remember(product) { mutableStateOf(product.stockQuantity.toString()) }
    var featured by remember(product) { mutableStateOf(product.featured) }
    var selectedImageUri by remember(product) { mutableStateOf<Uri?>(null) }
    var nameError by remember { mutableStateOf(false) }
    var priceError by remember { mutableStateOf(false) }
    var categoryError by remember { mutableStateOf(false) }
    var aiAssisting by remember { mutableStateOf(false) }
    var aiMessage by remember { mutableStateOf<String?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
        aiMessage = null
    }

    fun applyAiExtraction(extraction: AiExtraction) {
        extraction.name?.let { name = it; nameError = false }
        extraction.description?.let { description = it }
        extraction.sellingPrice?.let { price = it.toString(); priceError = false }
        extraction.category?.let { category = it; categoryError = false }
        extraction.unit?.let { unit = it }
        aiMessage = "AI filled the fields from your photo. Review before saving."
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Product") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Image picker
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(SmartRadiusSmall)
                    .clickable { if (!isLoading) imagePickerLauncher.launch("image/*") },
                contentAlignment = Alignment.Center
            ) {
                val displayUri = selectedImageUri?.toString() ?: product.displayImageUrl
                if (displayUri.isNotEmpty()) {
                    AsyncImage(
                        model = displayUri,
                        contentDescription = "Product Image",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Column(
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(40.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Tap to change photo")
                        }
                    }
                }
            }

            OutlinedButton(
                onClick = {
                    val uri = selectedImageUri
                    if (uri != null) {
                        aiAssisting = true
                        aiMessage = null
                        onAiAssist(
                            uri,
                            { extraction ->
                                aiAssisting = false
                                applyAiExtraction(extraction)
                            },
                            { error ->
                                aiAssisting = false
                                aiMessage = null
                                scope.launch {
                                    snackbarHostState.showSnackbar("AI Assistant: $error")
                                }
                            }
                        )
                    } else {
                        scope.launch {
                            snackbarHostState.showSnackbar("Select a new photo first")
                        }
                    }
                },
                enabled = selectedImageUri != null && !isLoading && !aiAssisting,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (aiAssisting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("AI is reading the photo…")
                } else {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("AI Assist — Auto-fill from photo")
                }
            }

            aiMessage?.let { message ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = SmartRadiusSmall
                ) {
                    Text(
                        text = message,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            OutlinedTextField(
                value = name,
                onValueChange = { name = it; nameError = false },
                label = { Text("Product Name *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isLoading,
                isError = nameError,
                supportingText = if (nameError) {{ Text("Product name is required") }} else null
            )

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 4,
                enabled = !isLoading
            )

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it; priceError = false },
                    label = { Text("Price (tsh) *") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    enabled = !isLoading,
                    isError = priceError,
                    supportingText = if (priceError) {{ Text("Valid price is required") }} else null
                )
                OutlinedTextField(
                    value = originalPrice,
                    onValueChange = { originalPrice = it },
                    label = { Text("Original (tsh)") },
                    placeholder = { Text("Optional") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    enabled = !isLoading
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                var expanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { if (!isLoading) expanded = it },
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = category,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Category *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        singleLine = true,
                        enabled = !isLoading,
                        isError = categoryError
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        CATEGORIES.forEach { cat ->
                            DropdownMenuItem(
                                text = { Text(cat) },
                                onClick = {
                                    category = cat
                                    expanded = false
                                }
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = unit,
                    onValueChange = { unit = it },
                    label = { Text("Unit") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    enabled = !isLoading
                )
            }

            OutlinedTextField(
                value = stockQuantity,
                onValueChange = { stockQuantity = it },
                label = { Text("Stock Quantity") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                enabled = !isLoading
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(
                    checked = featured,
                    onCheckedChange = { featured = it },
                    enabled = !isLoading
                )
                Spacer(Modifier.width(8.dp))
                Text("Feature this product")
            }

            Spacer(Modifier.height(8.dp))

            PrimaryButton(
                text = "Save Changes",
                onClick = {
                    nameError = name.isBlank()
                    priceError = price.toDoubleOrNull() == null || price.toDoubleOrNull()!! <= 0.0
                    categoryError = category.isBlank()
                    if (!nameError && !priceError && !categoryError) {
                        onSave(
                            product.id,
                            name.trim(),
                            description.trim(),
                            price.toDoubleOrNull() ?: 0.0,
                            originalPrice.toDoubleOrNull(),
                            category.trim(),
                            unit.trim(),
                            stockQuantity.toIntOrNull() ?: 0,
                            featured,
                            selectedImageUri
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                isLoading = isLoading
            )
        }
    }
}
