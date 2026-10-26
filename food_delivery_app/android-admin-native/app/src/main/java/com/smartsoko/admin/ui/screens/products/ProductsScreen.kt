package com.smartsoko.admin.ui.screens.products

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartsoko.admin.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(
    onProductClick: (String) -> Unit,
    viewModel: ProductsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val formState by viewModel.formState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadProducts() }

    var showSearch by remember { mutableStateOf(false) }
    var searchText by remember { mutableStateOf("") }
    var showCreateDialog by remember { mutableStateOf(false) }
    var showFilterMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.products), fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary, titleContentColor = MaterialTheme.colorScheme.onPrimary),
                actions = {
                    IconButton(onClick = { showSearch = !showSearch; if (!showSearch) { searchText = ""; viewModel.setSearchQuery("") } }) { Icon(Icons.Default.Search, contentDescription = stringResource(R.string.cd_search), tint = MaterialTheme.colorScheme.onPrimary) }
                    Box {
                        IconButton(onClick = { showFilterMenu = true }) { Icon(Icons.Default.FilterList, contentDescription = stringResource(R.string.cd_filter), tint = MaterialTheme.colorScheme.onPrimary) }
                        DropdownMenu(expanded = showFilterMenu, onDismissRequest = { showFilterMenu = false }) {
                            listOf("all", "groceries", "electronics", "fashion", "food", "general").forEach { c ->
                                DropdownMenuItem(text = { Text(c.replaceFirstChar { it.uppercase() }) }, onClick = { viewModel.setCategoryFilter(c); showFilterMenu = false })
                            }
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateDialog = true }) { Icon(Icons.Default.Add, contentDescription = stringResource(R.string.cd_add_product)) }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (showSearch) {
                OutlinedTextField(
                    value = searchText, onValueChange = { searchText = it; viewModel.setSearchQuery(it) },
                    placeholder = { Text(stringResource(R.string.search_products)) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { LoadingIndicator() }
            } else {
                LazyColumn {
                    item { Text(stringResource(R.string.products_count, uiState.products.size), modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    items(uiState.products, key = { it.id ?: "" }) { product ->
                        Card(
                            onClick = { product.id?.let { onProductClick(it) } },
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            shape = MaterialTheme.shapes.medium, elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Surface(modifier = Modifier.size(48.dp), shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                    Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Inventory2, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(product.name ?: stringResource(R.string.unknown), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(product.category ?: "general", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("TSh ${String.format("%.0f", product.price ?: 0.0)}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        val stockColor = if ((product.stock ?: 0) > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                                        Text(stringResource(R.string.stock_count, product.stock ?: 0), style = MaterialTheme.typography.labelSmall, color = stockColor)
                                    }
                                }
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }

        // Create dialog
        if (showCreateDialog) {
            AlertDialog(
                onDismissRequest = { showCreateDialog = false },
                title = { Text(stringResource(R.string.new_product)) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = formState.name, onValueChange = { v -> viewModel.updateForm { it.copy(name = v, error = null) } }, label = { Text(stringResource(R.string.field_name_required)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = formState.price, onValueChange = { v -> viewModel.updateForm { it.copy(price = v) } }, label = { Text(stringResource(R.string.field_price_required)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = formState.description, onValueChange = { v -> viewModel.updateForm { it.copy(description = v) } }, label = { Text(stringResource(R.string.description)) }, modifier = Modifier.fillMaxWidth(), maxLines = 3)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = formState.stock, onValueChange = { v -> viewModel.updateForm { it.copy(stock = v) } }, label = { Text(stringResource(R.string.field_stock)) }, singleLine = true, modifier = Modifier.weight(1f))
                            OutlinedTextField(value = formState.unit, onValueChange = { v -> viewModel.updateForm { it.copy(unit = v) } }, label = { Text(stringResource(R.string.field_unit)) }, singleLine = true, modifier = Modifier.weight(1f))
                        }
                        if (formState.error != null) { Text(formState.error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { viewModel.submitProduct(); if (formState.error == null) showCreateDialog = false }, enabled = !formState.isSubmitting) { Text(stringResource(R.string.create)) }
                },
                dismissButton = { TextButton(onClick = { showCreateDialog = false }) { Text(stringResource(R.string.cancel)) } }
            )
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
