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
import com.smartsoko.merchant.viewmodel.MerchantViewModel;

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

        viewModel.getOrders().observe(getViewLifecycleOwner(), orders -> {
            updateStats(orders != null ? orders.size() : 0);
        });
    }

    private void updateStats(int totalOrders) {
        tvTotalOrders.setText(String.valueOf(totalOrders));
        tvTotalRevenue.setText("KSh 0.00");
        tvPendingOrders.setText("0");
        tvCompletedOrders.setText("0");
    }
}
