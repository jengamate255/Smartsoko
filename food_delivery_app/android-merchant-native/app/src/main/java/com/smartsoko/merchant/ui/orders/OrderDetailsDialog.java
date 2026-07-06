package com.smartsoko.merchant.ui.orders;

import android.app.Dialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.DialogFragment;

import com.smartsoko.merchant.R;
import com.smartsoko.merchant.data.model.Order;

import java.text.SimpleDateFormat;
import java.util.Locale;

public class OrderDetailsDialog extends DialogFragment {

    private static final String ARG_ORDER = "order";
    private SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault());

    public static OrderDetailsDialog newInstance(Order order) {
        OrderDetailsDialog dialog = new OrderDetailsDialog();
        Bundle args = new Bundle();
        args.putSerializable(ARG_ORDER, order);
        dialog.setArguments(args);
        return dialog;
    }

    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        Order order = (Order) getArguments().getSerializable(ARG_ORDER);

        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext());
        View view = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_order_details, null);

        TextView tvOrderId = view.findViewById(R.id.tv_order_id);
        TextView tvCustomerName = view.findViewById(R.id.tv_customer_name);
        TextView tvCustomerPhone = view.findViewById(R.id.tv_customer_phone);
        TextView tvAddress = view.findViewById(R.id.tv_address);
        TextView tvItems = view.findViewById(R.id.tv_items);
        TextView tvTotal = view.findViewById(R.id.tv_total);
        TextView tvStatus = view.findViewById(R.id.tv_status);
        TextView tvPaymentMethod = view.findViewById(R.id.tv_payment_method);
        TextView tvOrderTime = view.findViewById(R.id.tv_order_time);

        if (order != null) {
            tvOrderId.setText("Order #" + order.getId());
            tvCustomerName.setText(order.getCustomerName());
            tvCustomerPhone.setText(order.getCustomerPhone());
            tvAddress.setText(order.getDeliveryAddress());
            tvItems.setText(order.getFormattedItems());
            tvTotal.setText(String.format("KSh %.2f", order.getTotalAmount() != null ? order.getTotalAmount() : 0));
            tvStatus.setText(order.getStatusDisplayName());
            tvStatus.setTextColor(order.getStatusColor());
            tvPaymentMethod.setText(order.getPaymentMethod() != null ? order.getPaymentMethod() : "N/A");
            if (order.getCreatedAt() != null) {
                tvOrderTime.setText(dateFormat.format(order.getCreatedAt()));
            }
        }

        builder.setView(view)
                .setPositiveButton("Close", (dialog, which) -> dialog.dismiss());

        return builder.create();
    }
}
