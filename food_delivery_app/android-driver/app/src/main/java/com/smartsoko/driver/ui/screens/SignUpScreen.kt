package com.smartsoko.driver.ui.screens

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
import com.smartsoko.driver.ui.components.*
import com.smartsoko.driver.util.Validators

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
        vehicleType: String,
        vehiclePlate: String
    ) -> Unit,
    onBack: () -> Unit,
    onClearError: () -> Unit
) {
    val vehicleTypes = listOf("Bicycle", "Motorcycle", "Car", "Van", "Truck")
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var vehicleType by remember { mutableStateOf(vehicleTypes.first()) }
    var vehiclePlate by remember { mutableStateOf("") }

    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmPasswordError by remember { mutableStateOf<String?>(null) }
    var nameError by remember { mutableStateOf<String?>(null) }
    var phoneError by remember { mutableStateOf<String?>(null) }
    var vehiclePlateError by remember { mutableStateOf<String?>(null) }
    var attemptedSubmit by remember { mutableStateOf(false) }

    var vehicleDropdownExpanded by remember { mutableStateOf(false) }

    fun validate(): Boolean {
        emailError = Validators.emailError(email)
        passwordError = Validators.isValidPassword(password) ?: if (password.isBlank()) "Password is required" else null
        confirmPasswordError = when {
            confirmPassword.isBlank() -> "Please confirm your password"
            confirmPassword != password -> "Passwords do not match"
            else -> null
        }
        nameError = Validators.requiredError(name, "Full name")
        phoneError = Validators.phoneError(phone)
        vehiclePlateError = Validators.requiredError(vehiclePlate, "Vehicle plate")
        return emailError == null && passwordError == null && confirmPasswordError == null &&
                nameError == null && phoneError == null && vehiclePlateError == null
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
                text = "Driver Information",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            )

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

            OutlinedTextField(
                value = name,
                onValueChange = {
                    name = it
                    if (attemptedSubmit) nameError = Validators.requiredError(it, "Full name")
                },
                label = { Text("Full Name *") },
                isError = nameError != null,
                supportingText = { if (nameError != null) Text(nameError!!, color = MaterialTheme.colorScheme.error) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            )

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

            ExposedDropdownMenuBox(
                expanded = vehicleDropdownExpanded,
                onExpandedChange = { vehicleDropdownExpanded = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            ) {
                OutlinedTextField(
                    value = vehicleType,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Vehicle Type *") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = vehicleDropdownExpanded) },
                    modifier = Modifier
                        .menuAnchor()
                        .fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = vehicleDropdownExpanded,
                    onDismissRequest = { vehicleDropdownExpanded = false }
                ) {
                    vehicleTypes.forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type) },
                            onClick = {
                                vehicleType = type
                                vehicleDropdownExpanded = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = vehiclePlate,
                onValueChange = {
                    vehiclePlate = it
                    if (attemptedSubmit) vehiclePlateError = Validators.requiredError(it, "Vehicle plate")
                },
                label = { Text("Vehicle Plate *") },
                isError = vehiclePlateError != null,
                supportingText = { if (vehiclePlateError != null) Text(vehiclePlateError!!, color = MaterialTheme.colorScheme.error) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Done
                ),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp)
            )

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
                            vehicleType,
                            vehiclePlate
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
