package com.smartsoko.merchant.ui.products;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.chip.ChipGroup;
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton;
import com.smartsoko.merchant.R;
import com.smartsoko.merchant.data.model.Product;
import com.smartsoko.merchant.viewmodel.MerchantViewModel;

import java.util.ArrayList;
import java.util.List;

public class ProductsFragment extends Fragment {

    private static final int FILTER_ALL = 0;
    private static final int FILTER_AVAILABLE = 1;
    private static final int FILTER_OUT_OF_STOCK = 2;

    private MerchantViewModel viewModel;
    private ProductsAdapter adapter;
    private SwipeRefreshLayout swipeRefreshLayout;
    private View emptyState;
    private EditText searchInput;

    private List<Product> allProducts = new ArrayList<>();
    private int filterMode = FILTER_ALL;
    private String query = "";

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

        RecyclerView recyclerView = view.findViewById(R.id.recycler_products);
        swipeRefreshLayout = view.findViewById(R.id.swipe_refresh);
        emptyState = view.findViewById(R.id.empty_state);
        searchInput = view.findViewById(R.id.et_search);
        ChipGroup chipGroup = view.findViewById(R.id.chip_group_filter);
        ExtendedFloatingActionButton fab = view.findViewById(R.id.fab_add_product);

        adapter = new ProductsAdapter(product -> ProductEditorDialog.show(
                requireContext(), product, new ProductEditorDialog.Callbacks() {
                    @Override
                    public void onSave(Product p) {
                        viewModel.saveProduct(p);
                    }

                    @Override
                    public void onDelete(Product p) {
                        viewModel.deleteProduct(p.getId());
                    }
                }));
        recyclerView.setLayoutManager(new GridLayoutManager(requireContext(), 2));
        recyclerView.setAdapter(adapter);

        swipeRefreshLayout.setOnRefreshListener(() -> viewModel.loadProducts());

        view.findViewById(R.id.chip_all).setOnClickListener(v -> setFilter(FILTER_ALL));
        view.findViewById(R.id.chip_available).setOnClickListener(v -> setFilter(FILTER_AVAILABLE));
        view.findViewById(R.id.chip_out_of_stock).setOnClickListener(v -> setFilter(FILTER_OUT_OF_STOCK));

        searchInput.addTextChangedListener(new android.text.TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                query = s.toString().toLowerCase().trim();
                applyFilters();
            }

            @Override
            public void afterTextChanged(android.text.Editable s) {}
        });

        fab.setOnClickListener(v -> ProductEditorDialog.show(
                requireContext(), null, new ProductEditorDialog.Callbacks() {
                    @Override
                    public void onSave(Product p) {
                        viewModel.saveProduct(p);
                    }

                    @Override
                    public void onDelete(Product p) {}
                }));

        viewModel.getProducts().observe(getViewLifecycleOwner(), products -> {
            allProducts = products != null ? products : new ArrayList<>();
            swipeRefreshLayout.setRefreshing(false);
            applyFilters();
        });

        viewModel.getErrorMessage().observe(getViewLifecycleOwner(), message -> {
            if (!TextUtils.isEmpty(message)) {
                swipeRefreshLayout.setRefreshing(false);
                Toast.makeText(requireContext(), message, Toast.LENGTH_LONG).show();
            }
        });

        viewModel.loadProducts();
    }

    private void setFilter(int mode) {
        filterMode = mode;
        applyFilters();
    }

    private void applyFilters() {
        List<Product> filtered = new ArrayList<>();
        for (Product p : allProducts) {
            if (filterMode == FILTER_AVAILABLE && (!p.isAvailable() || p.getStockQuantity() == 0)) continue;
            if (filterMode == FILTER_OUT_OF_STOCK && p.isAvailable() && p.getStockQuantity() > 0) continue;
            if (!query.isEmpty()) {
                String name = p.getName() == null ? "" : p.getName().toLowerCase();
                String cat = p.getCategory() == null ? "" : p.getCategory().toLowerCase();
                if (!name.contains(query) && !cat.contains(query)) continue;
            }
            filtered.add(p);
        }
        adapter.submit(filtered);
        emptyState.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
    }
}
