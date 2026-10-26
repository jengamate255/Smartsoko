package com.smartsoko.merchant;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBarDrawerToggle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.navigation.NavigationView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.smartsoko.merchant.ui.analytics.AnalyticsFragment;
import com.smartsoko.merchant.ui.login.LoginActivity;
import com.smartsoko.merchant.ui.orders.OrdersFragment;
import com.smartsoko.merchant.ui.products.ProductsFragment;
import com.smartsoko.merchant.ui.settings.SettingsFragment;
import com.smartsoko.merchant.viewmodel.MerchantViewModel;

public class MainActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener {

    private DrawerLayout drawerLayout;
    private NavigationView navigationView;
    private BottomNavigationView bottomNavigationView;
    private MerchantViewModel viewModel;
    private FirebaseUser currentUser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        currentUser = FirebaseAuth.getInstance().getCurrentUser();

        if (currentUser == null) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        viewModel = new ViewModelProvider(this).get(MerchantViewModel.class);
        viewModel.setCurrentUser(currentUser.getUid());

        initViews();
        setupNavigation();
        observeData();

        if (savedInstanceState == null) {
            loadFragment(new OrdersFragment());
            bottomNavigationView.setSelectedItemId(R.id.nav_orders);
        }
    }

    private void initViews() {
        drawerLayout = findViewById(R.id.drawer_layout);
        navigationView = findViewById(R.id.nav_view);
        bottomNavigationView = findViewById(R.id.bottom_navigation);

        androidx.appcompat.widget.Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawerLayout, toolbar,
                R.string.navigation_drawer_open,
                R.string.navigation_drawer_close);
        drawerLayout.addDrawerListener(toggle);
        toggle.syncState();
    }

    private void setupNavigation() {
        navigationView.setNavigationItemSelectedListener(this);

        View headerView = navigationView.getHeaderView(0);
        TextView tvUserEmail = headerView.findViewById(R.id.tv_user_email);
        TextView tvStoreName = headerView.findViewById(R.id.tv_store_name);

        if (currentUser.getEmail() != null) {
            tvUserEmail.setText(currentUser.getEmail());
        }

        bottomNavigationView.setOnItemSelectedListener(item -> {
            Fragment selectedFragment = null;
            int itemId = item.getItemId();

            if (itemId == R.id.nav_orders) {
                selectedFragment = new OrdersFragment();
            } else if (itemId == R.id.nav_products) {
                selectedFragment = new ProductsFragment();
            } else if (itemId == R.id.nav_analytics) {
                selectedFragment = new AnalyticsFragment();
            } else if (itemId == R.id.nav_settings) {
                selectedFragment = new SettingsFragment();
            }

            if (selectedFragment != null) {
                loadFragment(selectedFragment);
            }
            return true;
        });
    }

    private void observeData() {
        viewModel.getStoreName().observe(this, storeName -> {
            if (storeName != null && !storeName.isEmpty()) {
                View headerView = navigationView.getHeaderView(0);
                TextView tvStoreName = headerView.findViewById(R.id.tv_store_name);
                tvStoreName.setText(storeName);
                if (getSupportActionBar() != null) {
                    getSupportActionBar().setTitle(storeName);
                }
            }
        });

        viewModel.getErrorMessage().observe(this, error -> {
            if (error != null && !error.isEmpty()) {
                Toast.makeText(this, error, Toast.LENGTH_LONG).show();
            }
        });
    }

    private void loadFragment(Fragment fragment) {
        getSupportFragmentManager()
                .beginTransaction()
                .replace(R.id.fragment_container, fragment)
                .commit();
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        int itemId = item.getItemId();

        if (itemId == R.id.nav_drawer_orders) {
            loadFragment(new OrdersFragment());
            bottomNavigationView.setSelectedItemId(R.id.nav_orders);
        } else if (itemId == R.id.nav_drawer_products) {
            loadFragment(new ProductsFragment());
            bottomNavigationView.setSelectedItemId(R.id.nav_products);
        } else if (itemId == R.id.nav_drawer_analytics) {
            loadFragment(new AnalyticsFragment());
            bottomNavigationView.setSelectedItemId(R.id.nav_analytics);
        } else if (itemId == R.id.nav_drawer_settings) {
            loadFragment(new SettingsFragment());
            bottomNavigationView.setSelectedItemId(R.id.nav_settings);
        } else if (itemId == R.id.nav_drawer_logout) {
            logout();
        }

        drawerLayout.closeDrawer(GravityCompat.START);
        return true;
    }

    private void logout() {
        FirebaseAuth.getInstance().signOut();
        Toast.makeText(this, R.string.msg_logged_out, Toast.LENGTH_SHORT).show();
        startActivity(new Intent(this, LoginActivity.class));
        finish();
    }

    @Override
    public void onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }

    public MerchantViewModel getViewModel() {
        return viewModel;
    }
}
