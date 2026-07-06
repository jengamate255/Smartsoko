package com.fooddelivery.merchant1.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.fooddelivery.merchant1.data.model.Product

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(
    products: List<Product>,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onToggleAvailability: (String, Boolean) -> Unit,
    onDeleteProduct: (String) -> Unit,
    onEditProduct: (Product) -> Unit,
    onAddProduct: () -> Unit,
    onRefresh: () -> Unit
) {
    var productToDelete by remember { mutableStateOf<Product?>(null) }

    if (productToDelete != null) {
        AlertDialog(
            onDismissRequest = { productToDelete = null },
            title = { Text("Delete Product") },
            text = { Text("Are you sure you want to delete \"${productToDelete!!.name}\"? This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    onDeleteProduct(productToDelete!!.id)
                    productToDelete = null
                }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { productToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Search bar with refresh button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { onSearchQueryChange(it) },
                    placeholder = { Text("Search products") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { onSearchQueryChange("") }) {
                                Icon(Icons.Default.Clear, contentDescription = "Clear")
                            }
                        }
                    },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                }
            }

            if (products.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            if (searchQuery.isNotEmpty()) "No products match your search" else "No products yet",
                            style = MaterialTheme.typography.bodyLarge
                        )
                        if (searchQuery.isEmpty()) {
                            Text(
                                "Add your first product to get started",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(products) { product ->
                        ProductCard(
                            product = product,
                            onToggleAvailability = { onToggleAvailability(product.id, !product.available) },
                            onDelete = { productToDelete = product },
                            onEdit = { onEditProduct(product) }
                        )
                    }
                }
            }
        }

        FloatingActionButton(
            onClick = onAddProduct,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add Product")
        }
    }
}

@Composable
fun ProductCard(
    product: Product,
    onToggleAvailability: () -> Unit,
    onDelete: () -> Unit,
    onEdit: () -> Unit
) {
    val isLowStock = product.stockQuantity in 1..5
    val isOutOfStock = product.stockQuantity <= 0

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Product image
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(8.dp))
            ) {
                if (product.displayImageUrl.isNotEmpty()) {
                    AsyncImage(
                        model = product.displayImageUrl,
                        contentDescription = product.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                product.name.take(1).uppercase(),
                                style = MaterialTheme.typography.headlineSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = product.category,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = product.formattedPrice,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                if (product.hasDiscount) {
                    Text(
                        text = "${product.discountPercentage}% OFF",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
                if (isLowStock || isOutOfStock) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = if (isOutOfStock) "Out of stock" else "Low stock: ${product.stockQuantity} left",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                } else if (product.stockQuantity > 0) {
                    Text(
                        text = "Stock: ${product.stockQuantity} ${product.unit}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Switch(
                    checked = product.available,
                    onCheckedChange = { onToggleAvailability() }
                )
                Row {
                    IconButton(onClick = onEdit) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Edit",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    IconButton(onClick = onDelete) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Delete",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }
    }
}
