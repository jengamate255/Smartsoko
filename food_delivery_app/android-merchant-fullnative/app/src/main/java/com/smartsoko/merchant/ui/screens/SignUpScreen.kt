package com.smartsoko.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.smartsoko.merchant.ui.components.*
import com.smartsoko.merchant.util.Validators

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignUpScreen(
    isLoading: Boolean,
    error: String?,
    onSignUp: (
        email: String,
        password: String,
        name: String,
        phone: String,
        address: String,
        description: String,
        category: String,
        deliveryFee: String,
        minOrderAmount: String,
        deliveryTime: String
    ) -> Unit,
    onBack: () -> Unit,
    onClearError: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var deliveryFee by remember { mutableStateOf("") }
    var minOrderAmount by remember { mutableStateOf("") }
    var deliveryTime by remember { mutableStateOf("30-45 min") }

    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmPasswordError by remember { mutableStateOf<String?>(null) }
    var nameError by remember { mutableStateOf<String?>(null) }
    var phoneError by remember { mutableStateOf<String?>(null) }
    var addressError by remember { mutableStateOf<String?>(null) }
    var attemptedSubmit by remember { mutableStateOf(false) }

    fun validate(): Boolean {
        emailError = Validators.emailError(email)
        passwordError = Validators.isValidPassword(password) ?: if (password.isBlank()) "Password is required" else null
        confirmPasswordError = when {
            confirmPassword.isBlank() -> "Please confirm your password"
            confirmPassword != password -> "Passwords do not match"
            else -> null
        }
        nameError = Validators.requiredError(name, "Business name")
        phoneError = Validators.phoneError(phone)
        addressError = Validators.requiredError(address, "Address")
        return emailError == null && passwordError == null && confirmPasswordError == null &&
                nameError == null && phoneError == null && addressError == null
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Account") },
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
                .background(SurfaceGradient())
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            SmartCard {
            // Error message
            if (error != null) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    shape = SmartRadiusSmall,
                    color = MaterialTheme.colorScheme.errorContainer
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                LaunchedEffect(error) {
                    kotlinx.coroutines.delay(5000)
                    onClearError()
                }
            }

            Text(
                text = "Business Information",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            )

            // Email
            OutlinedTextField(
                value = email,
                onValueChange = {
                    email = it
                    if (attemptedSubmit) emailError = Validators.emailError(it)
                },
                label = { Text("Email *") },
                isError = emailError != null,
                supportingText = { if (emailError != null) Text(emailError!!, color = MaterialTheme.colorScheme.error) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

            // Password
            OutlinedTextField(
                value = password,
                onValueChange = {
                    password = it
                    if (attemptedSubmit) {
                        passwordError = Validators.isValidPassword(it)
                        if (confirmPassword.isNotBlank() && confirmPassword != it) {
                            confirmPasswordError = "Passwords do not match"
                        } else {
                            confirmPasswordError = null
                        }
                    }
                },
                label = { Text("Password *") },
                isError = passwordError != null,
                supportingText = { if (passwordError != null) Text(passwordError!!, color = MaterialTheme.colorScheme.error) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Next
                ),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

            // Confirm Password
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = {
                    confirmPassword = it
                    if (attemptedSubmit) {
                        confirmPasswordError = when {
                            it.isBlank() -> "Please confirm your password"
                            it != password -> "Passwords do not match"
                            else -> null
                        }
                    }
                },
                label = { Text("Confirm Password *") },
                isError = confirmPasswordError != null,
                supportingText = { if (confirmPasswordError != null) Text(confirmPasswordError!!, color = MaterialTheme.colorScheme.error) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Next
                ),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

            // Business Name
            OutlinedTextField(
                value = name,
                onValueChange = {
                    name = it
                    if (attemptedSubmit) nameError = Validators.requiredError(it, "Business name")
                },
                label = { Text("Business Name *") },
                isError = nameError != null,
                supportingText = { if (nameError != null) Text(nameError!!, color = MaterialTheme.colorScheme.error) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

            // Phone
            OutlinedTextField(
                value = phone,
                onValueChange = {
                    phone = it
                    if (attemptedSubmit) phoneError = Validators.phoneError(it)
                },
                label = { Text("Phone *") },
                isError = phoneError != null,
                supportingText = { if (phoneError != null) Text(phoneError!!, color = MaterialTheme.colorScheme.error) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Phone,
                    imeAction = ImeAction.Next
                ),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            )

            // Category
            OutlinedTextField(
                value = category,
                onValueChange = { category = it },
                label = { Text("Category (e.g., Restaurant, Grocery)") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            )

            // Address
            OutlinedTextField(
                value = address,
                onValueChange = {
                    address = it
                    if (attemptedSubmit) addressError = Validators.requiredError(it, "Address")
                },
                label = { Text("Address *") },
                isError = addressError != null,
                supportingText = { if (addressError != null) Text(addressError!!, color = MaterialTheme.colorScheme.error) },
                keyboardOptions = KeyboardOptions(
                    imeAction = ImeAction.Next
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

            // Description
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description") },
                maxLines = 3,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            )

            // Delivery Fee
            OutlinedTextField(
                value = deliveryFee,
                onValueChange = { deliveryFee = it.filter { c -> c.isDigit() || c == '.' } },
                label = { Text("Delivery Fee (tsh)") },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal,
                    imeAction = ImeAction.Next
                ),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            )

            // Min Order Amount
            OutlinedTextField(
                value = minOrderAmount,
                onValueChange = { minOrderAmount = it.filter { c -> c.isDigit() || c == '.' } },
                label = { Text("Min Order Amount (tsh)") },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal,
                    imeAction = ImeAction.Next
                ),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            )

            // Delivery Time
            OutlinedTextField(
                value = deliveryTime,
                onValueChange = { deliveryTime = it },
                label = { Text("Delivery Time (e.g., 30-45 min)") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp)
            )

            // Sign Up button
            PrimaryButton(
                text = "Create Account",
                isLoading = isLoading,
                onClick = {
                    attemptedSubmit = true
                    if (validate()) {
                        onSignUp(
                            email,
                            password,
                            name,
                            phone,
                            address,
                            description,
                            category,
                            deliveryFee,
                            minOrderAmount,
                            deliveryTime
                        )
                    }
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(onClick = onBack) {
                Text("Already have an account? Sign In", color = MaterialTheme.colorScheme.primary)
            }
            }
        }
    }
}
