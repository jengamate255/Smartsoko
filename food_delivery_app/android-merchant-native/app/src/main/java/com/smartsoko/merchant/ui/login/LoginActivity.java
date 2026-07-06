package com.smartsoko.merchant.ui.login;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import com.smartsoko.merchant.MainActivity;
import com.smartsoko.merchant.R;

public class LoginActivity extends AppCompatActivity {

    private EditText etEmail, etPassword;
    private Button btnLogin;
    private ProgressBar progressBar;
    private TextView tvError;

    private FirebaseAuth firebaseAuth;
    private FirebaseFirestore firestore;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        firebaseAuth = FirebaseAuth.getInstance();
        firestore = FirebaseFirestore.getInstance();

        initViews();
        setupListeners();
    }

    @Override
    protected void onStart() {
        super.onStart();
        FirebaseUser currentUser = firebaseAuth.getCurrentUser();
        if (currentUser != null) {
            checkUserRole(currentUser.getUid());
        }
    }

    private void initViews() {
        etEmail = findViewById(R.id.et_email);
        etPassword = findViewById(R.id.et_password);
        btnLogin = findViewById(R.id.btn_login);
        progressBar = findViewById(R.id.progress_bar);
        tvError = findViewById(R.id.tv_error);
    }

    private void setupListeners() {
        btnLogin.setOnClickListener(v -> attemptLogin());

        findViewById(R.id.tv_forgot_password).setOnClickListener(v -> {
            String email = etEmail.getText().toString().trim();
            if (email.isEmpty()) {
                etEmail.setError("Enter your email first");
                return;
            }
            firebaseAuth.sendPasswordResetEmail(email)
                    .addOnSuccessListener(aVoid ->
                            Toast.makeText(this, "Password reset email sent", Toast.LENGTH_SHORT).show())
                    .addOnFailureListener(e ->
                            Toast.makeText(this, "Failed: " + e.getMessage(), Toast.LENGTH_SHORT).show());
        });
    }

    private void attemptLogin() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (email.isEmpty()) {
            etEmail.setError("Email is required");
            etEmail.requestFocus();
            return;
        }

        if (password.isEmpty()) {
            etPassword.setError("Password is required");
            etPassword.requestFocus();
            return;
        }

        showLoading(true);
        tvError.setVisibility(View.GONE);

        firebaseAuth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(this, task -> {
                    showLoading(false);
                    if (task.isSuccessful()) {
                        FirebaseUser user = firebaseAuth.getCurrentUser();
                        if (user != null) {
                            checkUserRole(user.getUid());
                        }
                    } else {
                        tvError.setText("Authentication failed: " + task.getException().getMessage());
                        tvError.setVisibility(View.VISIBLE);
                    }
                });
    }

    private void checkUserRole(String userId) {
        showLoading(true);

        firestore.collection("users").document(userId).get()
                .addOnSuccessListener(documentSnapshot -> {
                    showLoading(false);
                    if (documentSnapshot.exists()) {
                        String role = documentSnapshot.getString("role");
                        if ("merchant".equals(role) || "seller".equals(role) || "admin".equals(role)) {
                            startActivity(new Intent(LoginActivity.this, MainActivity.class));
                            finish();
                        } else {
                            tvError.setText("Access denied. This account is not authorized as a merchant.");
                            tvError.setVisibility(View.VISIBLE);
                            firebaseAuth.signOut();
                        }
                    } else {
                        tvError.setText("User profile not found.");
                        tvError.setVisibility(View.VISIBLE);
                    }
                })
                .addOnFailureListener(e -> {
                    showLoading(false);
                    tvError.setText("Error checking role: " + e.getMessage());
                    tvError.setVisibility(View.VISIBLE);
                });
    }

    private void showLoading(boolean show) {
        progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
        btnLogin.setEnabled(!show);
    }
}
