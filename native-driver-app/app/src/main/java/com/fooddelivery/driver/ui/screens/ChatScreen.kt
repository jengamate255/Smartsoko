package com.fooddelivery.driver.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.livedata.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.fooddelivery.driver.R
import androidx.compose.foundation.clickable
import com.fooddelivery.driver.realtime.SocketManager
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import com.fooddelivery.driver.ui.state.AppViewModel
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import androidx.compose.ui.draw.clip

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    viewModel: AppViewModel = viewModel(),
    orderId: String = "sample_order_123" // In real app, this would come from navigation arguments
) {
    SmartSokoDriverTheme {
        // Collect state from ViewModel
        val messages by viewModel.messages.observeAsState(emptyList())
        val isLoading by viewModel.isLoading.observeAsState(false)
        val error by viewModel.error.observeAsState()
        val user by viewModel.user.observeAsState()
        val isOnline by viewModel.isOnline.observeAsState(false)
        val activeOrder by viewModel.activeOrder.observeAsState()

        // Text field state for message input
        var messageText by remember { mutableStateOf("") }
        // Scroll state for chat list
        val listState = rememberLazyListState()
        val coroutineScope = rememberCoroutineScope()

        Column(modifier = Modifier.fillMaxSize()) {
            // App Bar
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(24.dp).clickable {
                                // TODO: Navigate back
                            }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "Chat with Customer",
                                style = MaterialTheme.typography.titleMedium
                            )
                            Text(
                                text = "Order #${orderId.takeLast(4)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
            )

            // Show error if any
            error?.let { errorMessage ->
                Snackbar(
                    modifier = Modifier.fillMaxWidth(),
                    action = {
                        TextButton(onClick = { }) {
                            Text("Dismiss")
                        }
                    },
                    content = { Text(text = errorMessage) }
                )
            }

            // Main content
            when {
                isLoading -> {
                    // Show loading indicator
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(24.dp)
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.align(Alignment.Center),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                user == null -> {
                    // Show login screen
                    AuthScreen(
                        viewModel = viewModel,
                        onLoginSuccess = { email, password ->
                            viewModel.signIn(email, password)
                        }
                    )
                }
                else -> {
                    // Chat interface
                    Column {
                        // Messages list
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            state = listState,
                            contentPadding = PaddingValues(bottom = 80.dp) // Space for input field
                        ) {
                            items(messages) { message ->
                                ChatMessageBubble(
                                    message = message,
                                    isOwnMessage = message.senderId == user?.id
                                )
                            }
                        }

                        // Input field at bottom
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                                .background(MaterialTheme.colorScheme.surface),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextField(
                                value = messageText,
                                onValueChange = { messageText = it },
                                label = { Text("Type a message...") },
                                isError = messageText.isEmpty(),
                                leadingIcon = {
                                    Icon(
                                        imageVector = Icons.Default.Chat,
                                        contentDescription = "Chat",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                },
                                trailingIcon = {
                                    IconButton(
                                        onClick = {
                                            if (messageText.isNotEmpty()) {
                                                // Send message
                                                viewModel.sendChatMessage(orderId, messageText)
                                                messageText = ""
                                                // Scroll to bottom
                                                coroutineScope.launch {
                                                    listState.animateScrollToItem(messages.size - 1)
                                                }
                                            }
                                        },
                                        enabled = messageText.isNotEmpty()
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Send,
                                            contentDescription = "Send",
                                            tint = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                },
                                keyboardOptions = KeyboardOptions(
                                    imeAction = ImeAction.Send
                                ),
                                keyboardActions = KeyboardActions(
                                    onSend = {
                                        if (messageText.isNotEmpty()) {
                                            viewModel.sendChatMessage(orderId, messageText)
                                            messageText = ""
                                            coroutineScope.launch {
                                                listState.animateScrollToItem(messages.size - 1)
                                            }
                                        }
                                    }
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(end = 8.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatMessageBubble(
    message: SocketManager.ChatMessage,
    isOwnMessage: Boolean
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = if (isOwnMessage) Arrangement.End else Arrangement.Start
    ) {
        Column {
            // Message bubble
            Row(
                modifier = Modifier
                    .padding(12.dp)
                    .background(
                        if (isOwnMessage) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant
                        }
                    )
                    .border(
                        width = 1.dp,
                        color = if (isOwnMessage) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.outlineVariant
                        }
                    )
                    .clip(shape = MaterialTheme.shapes.medium)
            ) {
                Column {
                    // Message content
                    Text(
                        text = message.message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isOwnMessage) {
                            MaterialTheme.colorScheme.onPrimary
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        }
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    // Timestamp
                    Text(
                        text = formatTimestamp(message.timestamp),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isOwnMessage) {
                            MaterialTheme.colorScheme.onPrimary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        modifier = Modifier.align(alignment = if (isOwnMessage) Alignment.End else Alignment.Start)
                    )
                }
            }

            // Avatar (only for other user's messages)
            if (!isOwnMessage) {
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = message.senderName.take(1).uppercase(),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }
        }
    }
}

private fun formatTimestamp(timestampString: String): String {
    // Simple timestamp formatting - in production, use proper date parsing
    try {
        // Assuming ISO timestamp format
        val time = java.time.Instant.parse(timestampString)
        val hour = time.atZone(java.time.ZoneId.systemDefault()).hour
        val minute = time.atZone(java.time.ZoneId.systemDefault()).minute
        return "%02d:%02d".format(hour, minute)
    } catch (e: Exception) {
        return timestampString.takeLast(5) // Fallback to last 5 chars
    }
}