package com.smartsoko.merchant.ui.orders;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.tabs.TabLayout;
import com.smartsoko.merchant.MainActivity;
import com.smartsoko.merchant.R;
import com.smartsoko.merchant.data.model.Order;
import com.smartsoko.merchant.viewmodel.MerchantViewModel;

import java.util.ArrayList;
import java.util.List;

public class OrdersFragment extends Fragment {

    private RecyclerView recyclerView;
    private OrdersAdapter adapter;
    private SwipeRefreshLayout swipeRefreshLayout;
    private TabLayout tabLayout;
    private Spinner spinnerSort;

    private MerchantViewModel viewModel;
    private List<Order> allOrders = new ArrayList<>();
    private String currentFilter = "all";

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(requireActivity()).get(MerchantViewModel.class);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                            @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_orders, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        initViews(view);
        setupRecyclerView();
        setupTabs();
        setupSpinner();
        observeData();
    }

    private void initViews(View view) {
        recyclerView = view.findViewById(R.id.recycler_orders);
        swipeRefreshLayout = view.findViewById(R.id.swipe_refresh);
        tabLayout = view.findViewById(R.id.tab_layout);
        spinnerSort = view.findViewById(R.id.spinner_sort);

        swipeRefreshLayout.setOnRefreshListener(() -> {
            swipeRefreshLayout.setRefreshing(false);
            filterOrders(currentFilter);
        });
    }

    private void setupRecyclerView() {
        adapter = new OrdersAdapter(new OrdersAdapter.OnOrderActionListener() {
            @Override
            public void onAcceptOrder(Order order) {
                viewModel.acceptOrder(order.getId());
                Toast.makeText(requireContext(), "Order accepted", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onRejectOrder(Order order) {
                viewModel.rejectOrder(order.getId());
                Toast.makeText(requireContext(), "Order rejected", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onMarkReady(Order order) {
                viewModel.markOrderReady(order.getId());
                Toast.makeText(requireContext(), "Order marked as ready", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onMarkDelivered(Order order) {
                viewModel.markOrderDelivered(order.getId());
                Toast.makeText(requireContext(), "Order marked as delivered", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onViewDetails(Order order) {
                showOrderDetails(order);
            }
        });

        recyclerView.setLayoutManager(new LinearLayoutManager(requireContext()));
        recyclerView.setAdapter(adapter);
    }

    private void setupTabs() {
        tabLayout.addTab(tabLayout.newTab().setText("All"));
        tabLayout.addTab(tabLayout.newTab().setText("Pending"));
        tabLayout.addTab(tabLayout.newTab().setText("Active"));
        tabLayout.addTab(tabLayout.newTab().setText("Completed"));

        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                switch (tab.getPosition()) {
                    case 0:
                        currentFilter = "all";
                        break;
                    case 1:
                        currentFilter = "pending";
                        break;
                    case 2:
                        currentFilter = "active";
                        break;
                    case 3:
                        currentFilter = "completed";
                        break;
                }
                filterOrders(currentFilter);
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {}

            @Override
            public void onTabReselected(TabLayout.Tab tab) {}
        });
    }

    private void setupSpinner() {
        ArrayAdapter<CharSequence> sortAdapter = ArrayAdapter.createFromResource(requireContext(),
                R.array.sort_options, android.R.layout.simple_spinner_item);
        sortAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerSort.setAdapter(sortAdapter);

        spinnerSort.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                // Sort orders based on selection
                sortOrders(position);
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void observeData() {
        viewModel.getOrders().observe(getViewLifecycleOwner(), orders -> {
            allOrders = orders != null ? orders : new ArrayList<>();
            filterOrders(currentFilter);
        });

        viewModel.getIsLoading().observe(getViewLifecycleOwner(), isLoading -> {
            swipeRefreshLayout.setRefreshing(isLoading != null && isLoading);
        });

        viewModel.getErrorMessage().observe(getViewLifecycleOwner(), error -> {
            if (error != null && !error.isEmpty()) {
                Toast.makeText(requireContext(), error, Toast.LENGTH_LONG).show();
            }
        });
    }

    private void filterOrders(String filter) {
        List<Order> filteredOrders = new ArrayList<>();

        for (Order order : allOrders) {
            String status = order.getStatus();
            if (status == null) status = "unknown";

            switch (filter) {
                case "all":
                    filteredOrders.add(order);
                    break;
                case "pending":
                    if ("pending".equals(status)) {
                        filteredOrders.add(order);
                    }
                    break;
                case "active":
                    if ("accepted".equals(status) || "ready".equals(status)) {
                        filteredOrders.add(order);
                    }
                    break;
                case "completed":
                    if ("delivered".equals(status) || "completed".equals(status)) {
                        filteredOrders.add(order);
                    }
                    break;
            }
        }

        adapter.setOrders(filteredOrders);
        updateEmptyState(filteredOrders.isEmpty());
    }

    private void sortOrders(int sortType) {
        // Sort implementation based on spinner selection
        // 0 = Newest first, 1 = Oldest first, 2 = Amount high to low, 3 = Amount low to high
        // This is handled by the adapter or can be implemented here
    }

    private void updateEmptyState(boolean isEmpty) {
        View emptyView = requireView().findViewById(R.id.empty_state);
        if (emptyView != null) {
            emptyView.setVisibility(isEmpty ? View.VISIBLE : View.GONE);
            recyclerView.setVisibility(isEmpty ? View.GONE : View.VISIBLE);
        }
    }

    private void showOrderDetails(Order order) {
        OrderDetailsDialog dialog = OrderDetailsDialog.newInstance(order);
        dialog.show(getParentFragmentManager(), "order_details");
    }
}
