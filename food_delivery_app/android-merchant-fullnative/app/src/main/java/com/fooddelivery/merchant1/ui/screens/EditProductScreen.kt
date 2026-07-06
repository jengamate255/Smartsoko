package com.fooddelivery.merchant1.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.fooddelivery.merchant1.data.model.Product

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProductScreen(
    product: Product,
    isLoading: Boolean,
    onBack: () -> Unit,
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

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
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
        }
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
                    .clip(RoundedCornerShape(12.dp))
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

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Product Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isLoading
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
                    onValueChange = { price = it },
                    label = { Text("Price (KSh)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    enabled = !isLoading
                )
                OutlinedTextField(
                    value = originalPrice,
                    onValueChange = { originalPrice = it },
                    label = { Text("Original (KSh)") },
                    placeholder = { Text("Optional") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    enabled = !isLoading
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text("Category") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    enabled = !isLoading
                )
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

            Button(
                onClick = {
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
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading && name.isNotBlank() && price.isNotBlank()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Save Changes")
                }
            }
        }
    }
}
