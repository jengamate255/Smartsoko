package com.smartsoko.merchant.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartsoko.merchant.data.model.Product

@Composable
fun ProductsScreen(
    products: List<Product>,
    onToggleAvailability: (String, Boolean) -> Unit,
    onDeleteProduct: (String) -> Unit,
    onAddProduct: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        if (products.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    "No products yet",
                    style = MaterialTheme.typography.bodyLarge
                )
                Text(
                    "Add your first product to get started",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(products) { product ->
                    ProductCard(
                        product = product,
                        onToggleAvailability = { onToggleAvailability(product.id, !product.available) },
                        onDelete = { onDeleteProduct(product.id) }
                    )
                }
            }
        }

        FloatingActionButton(
            onClick = onAddProduct,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
        ) {
            Text("+")
        }
    }
}

@Composable
fun ProductCard(
    product: Product,
    onToggleAvailability: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = product.category,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = product.formattedPrice,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 4.dp)
                )
                if (product.hasDiscount) {
                    Text(
                        text = "${product.discountPercentage}% OFF",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = if (product.available) "Available" else "Unavailable",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Switch(
                        checked = product.available,
                        onCheckedChange = { onToggleAvailability() }
                    )
                }
                TextButton(onClick = onDelete) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}
