package com.smartsoko.admin.ui.screens.products

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    productId: String,
    viewModel: ProductDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(productId) { viewModel.loadProduct(productId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Product Details", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary, titleContentColor = MaterialTheme.colorScheme.onPrimary),
                navigationIcon = { IconButton(onClick = { /* navController.popBackStack() */ }) { Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = MaterialTheme.colorScheme.onPrimary) } },
                actions = {
                    IconButton(onClick = { viewModel.deleteProduct() }) { Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.onPrimary) }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { LoadingIndicator() }
        } else if (uiState.error != null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
                    Text(uiState.error!!, color = MaterialTheme.colorScheme.error)
                }
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item {
                    Card(shape = MaterialTheme.shapes.large) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Surface(modifier = Modifier.fillMaxWidth().height(180.dp), shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Inventory2, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(uiState.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                            Text(uiState.category, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("TSh ${String.format("%.0f", uiState.price)}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }

                item {
                    Card(shape = MaterialTheme.shapes.large) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Details", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(12.dp))
                            Row { Text("Stock: ", style = MaterialTheme.typography.bodySmall); Text("${uiState.stock}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, color = if (uiState.stock > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error) }
                            Row { Text("Unit: ", style = MaterialTheme.typography.bodySmall); Text(uiState.unit, style = MaterialTheme.typography.bodySmall) }
                            Row { Text("Available: ", style = MaterialTheme.typography.bodySmall); Text(if (uiState.isAvailable) "Yes" else "No", style = MaterialTheme.typography.bodySmall) }
                        }
                    }
                }

                if (uiState.description.isNotBlank()) {
                    item {
                        Card(shape = MaterialTheme.shapes.large) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Description", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(uiState.description, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
private fun LoadingIndicator(modifier: Modifier = Modifier) {
    androidx.compose.ui.viewinterop.AndroidView(
        factory = { ctx: android.content.Context ->
            android.widget.ProgressBar(ctx)
        },
        modifier = modifier
    )
}
