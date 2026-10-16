package com.smartsoko.merchant.ui.products;

import android.Manifest;
import android.os.Bundle;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.MediaStore;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.smartsoko.merchant.R;
import com.smartsoko.merchant.data.model.Product;
import com.smartsoko.merchant.viewmodel.MerchantViewModel;

import java.util.ArrayList;

public class ProductsFragment extends Fragment {

    private RecyclerView recyclerView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private FloatingActionButton fabAddProduct;
    private MerchantViewModel viewModel;

    // Image picker result launcher
    private ActivityResultLauncher<Intent> imagePickerLauncher;

    // UI components for AI product entry
    private ImageView ivProductImage;
    private EditText etProductName;
    private EditText etProductPrice;
    private EditText etProductDescription;
    private ProgressBar aiProgressBar;
    private Button btnUseAI;
    private TextView tvAIStatus;

    public ProductsFragment() {
        // Initialize image picker launcher
        imagePickerLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == getActivity().RESULT_OK && result.getData() != null) {
                        // Get the selected image URI and load it
                        Uri imageUri = result.getData().getData();
                        // Load image into UI - placeholder for now
                        if (ivProductImage != null) {
                            // ivProductImage.setImageURI(imageUri); // TODO: load image
                        }
                        // Run AI extraction on the selected image
                        if (aiProgressBar != null) {
                            aiProgressBar.setVisibility(View.VISIBLE);
                        }
                        if (btnUseAI != null) {
                            btnUseAI.setEnabled(false);
                        }
                        // TODO: Convert URI to bytes and call viewModel.detectProductFromImage()
                    }
                });
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(requireActivity()).get(MerchantViewModel.class);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_products, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        recyclerView = view.findViewById(R.id.recycler_products);
        swipeRefreshLayout = view.findViewById(R.id.swipe_refresh);
        fabAddProduct = view.findViewById(R.id.fab_add_product);

        // TODO: Initialize AI product entry UI components
        // ivProductImage = view.findViewById(R.id.iv_product_image);
        // etProductName = view.findViewById(R.id.et_product_name);
        // etProductPrice = view.findViewById(R.id.et_product_price);
        // etProductDescription = view.findViewById(R.id.et_product_description);
        // aiProgressBar = view.findViewById(R.id.ai_progress_bar);
        // btnUseAI = view.findViewById(R.id.btn_use_ai);
        // tvAIStatus = view.findViewById(R.id.tv_ai_status);

        recyclerView.setLayoutManager(new LinearLayoutManager(requireContext()));
        swipeRefreshLayout.setOnRefreshListener(() -> {
            viewModel.loadProducts();
            swipeRefreshLayout.setRefreshing(false);
        });

        fabAddProduct.setOnClickListener(v -> {
            // Open image picker for AI product detection
            Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            imagePickerLauncher.launch(intent);
        });

        viewModel.getProducts().observe(getViewLifecycleOwner(), products -> {
            // Update adapter with products
        });

        viewModel.loadProducts();
    }
}
