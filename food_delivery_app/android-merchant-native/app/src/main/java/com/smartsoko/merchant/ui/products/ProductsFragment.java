package com.smartsoko.merchant.ui.products;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
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

        recyclerView.setLayoutManager(new LinearLayoutManager(requireContext()));
        swipeRefreshLayout.setOnRefreshListener(() -> {
            viewModel.loadProducts();
            swipeRefreshLayout.setRefreshing(false);
        });

        fabAddProduct.setOnClickListener(v -> {
            Toast.makeText(requireContext(), "Add Product - Coming Soon", Toast.LENGTH_SHORT).show();
        });

        viewModel.getProducts().observe(getViewLifecycleOwner(), products -> {
            // Update adapter with products
        });

        viewModel.loadProducts();
    }
}
