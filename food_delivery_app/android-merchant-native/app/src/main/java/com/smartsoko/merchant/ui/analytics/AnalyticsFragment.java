package com.smartsoko.merchant.ui.analytics;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.smartsoko.merchant.R;
import com.smartsoko.merchant.data.model.Order;
import com.smartsoko.merchant.viewmodel.MerchantViewModel;

import java.util.List;
import java.util.Locale;

public class AnalyticsFragment extends Fragment {

    private TextView tvTotalRevenue, tvTotalOrders, tvPendingOrders, tvCompletedOrders;
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
        return inflater.inflate(R.layout.fragment_analytics, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        tvTotalRevenue = view.findViewById(R.id.tv_total_revenue);
        tvTotalOrders = view.findViewById(R.id.tv_total_orders);
        tvPendingOrders = view.findViewById(R.id.tv_pending_orders);
        tvCompletedOrders = view.findViewById(R.id.tv_completed_orders);

        viewModel.getOrders().observe(getViewLifecycleOwner(), this::updateStats);
    }

    private void updateStats(List<Order> orders) {
        double revenue = 0;
        int pending = 0;
        int completed = 0;
        if (orders != null) {
            for (Order order : orders) {
                String status = order.getStatus() == null ? "" : order.getStatus().toLowerCase();
                if ("delivered".equals(status) || "completed".equals(status)) {
                    if (order.getTotalAmount() != null) {
                        revenue += order.getTotalAmount();
                    }
                    completed++;
                } else if ("pending".equals(status)) {
                    pending++;
                }
            }
        }
        tvTotalOrders.setText(String.valueOf(orders == null ? 0 : orders.size()));
        tvTotalRevenue.setText(String.format(Locale.US, "TSh %.2f", revenue));
        tvPendingOrders.setText(String.valueOf(pending));
        tvCompletedOrders.setText(String.valueOf(completed));
    }
}
