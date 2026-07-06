package com.smartsoko.merchant.ui.orders;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;

import com.smartsoko.merchant.R;
import com.smartsoko.merchant.data.model.Order;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class OrdersAdapter extends RecyclerView.Adapter<OrdersAdapter.OrderViewHolder> {

    private List<Order> orders = new ArrayList<>();
    private final OnOrderActionListener listener;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault());

    public interface OnOrderActionListener {
        void onAcceptOrder(Order order);
        void onRejectOrder(Order order);
        void onMarkReady(Order order);
        void onMarkDelivered(Order order);
        void onViewDetails(Order order);
    }

    public OrdersAdapter(OnOrderActionListener listener) {
        this.listener = listener;
    }

    public void setOrders(List<Order> orders) {
        this.orders = orders;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public OrderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_order, parent, false);
        return new OrderViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull OrderViewHolder holder, int position) {
        Order order = orders.get(position);
        holder.bind(order);
    }

    @Override
    public int getItemCount() {
        return orders.size();
    }

    class OrderViewHolder extends RecyclerView.ViewHolder {
        private final CardView cardView;
        private final TextView tvOrderId, tvCustomerName, tvCustomerPhone, tvOrderTime,
                tvItems, tvTotal, tvStatus, tvAddress;
        private final LinearLayout actionsPending, actionsAccepted, actionsReady;
        private final Button btnAccept, btnReject, btnReady, btnDelivered, btnViewDetails;

        OrderViewHolder(@NonNull View itemView) {
            super(itemView);
            cardView = itemView.findViewById(R.id.card_order);
            tvOrderId = itemView.findViewById(R.id.tv_order_id);
            tvCustomerName = itemView.findViewById(R.id.tv_customer_name);
            tvCustomerPhone = itemView.findViewById(R.id.tv_customer_phone);
            tvOrderTime = itemView.findViewById(R.id.tv_order_time);
            tvItems = itemView.findViewById(R.id.tv_items);
            tvTotal = itemView.findViewById(R.id.tv_total);
            tvStatus = itemView.findViewById(R.id.tv_status);
            tvAddress = itemView.findViewById(R.id.tv_address);

            actionsPending = itemView.findViewById(R.id.actions_pending);
            actionsAccepted = itemView.findViewById(R.id.actions_accepted);
            actionsReady = itemView.findViewById(R.id.actions_ready);

            btnAccept = itemView.findViewById(R.id.btn_accept);
            btnReject = itemView.findViewById(R.id.btn_reject);
            btnReady = itemView.findViewById(R.id.btn_ready);
            btnDelivered = itemView.findViewById(R.id.btn_delivered);
            btnViewDetails = itemView.findViewById(R.id.btn_view_details);
        }

        void bind(Order order) {
            tvOrderId.setText("Order #" + order.getId().substring(0, Math.min(8, order.getId().length())));
            tvCustomerName.setText(order.getCustomerName() != null ? order.getCustomerName() : "Unknown Customer");
            tvCustomerPhone.setText(order.getCustomerPhone() != null ? order.getCustomerPhone() : "No phone");

            if (order.getCreatedAt() != null) {
                tvOrderTime.setText(dateFormat.format(order.getCreatedAt()));
            } else {
                tvOrderTime.setText("Unknown time");
            }

            tvItems.setText(order.getFormattedItems());

            if (order.getTotalAmount() != null) {
                tvTotal.setText(String.format("KSh %.2f", order.getTotalAmount()));
            } else {
                tvTotal.setText("KSh 0.00");
            }

            tvStatus.setText(order.getStatusDisplayName());
            tvStatus.setTextColor(order.getStatusColor());

            if (order.getDeliveryAddress() != null) {
                tvAddress.setText(order.getDeliveryAddress());
                tvAddress.setVisibility(View.VISIBLE);
            } else {
                tvAddress.setVisibility(View.GONE);
            }

            // Show/hide action buttons based on status
            setupActionButtons(order);

            // Card click to view details
            cardView.setOnClickListener(v -> listener.onViewDetails(order));
            btnViewDetails.setOnClickListener(v -> listener.onViewDetails(order));
        }

        private void setupActionButtons(Order order) {
            String status = order.getStatus();
            if (status == null) status = "unknown";

            // Hide all action containers by default
            actionsPending.setVisibility(View.GONE);
            actionsAccepted.setVisibility(View.GONE);
            actionsReady.setVisibility(View.GONE);

            switch (status.toLowerCase()) {
                case "pending":
                    actionsPending.setVisibility(View.VISIBLE);
                    btnAccept.setOnClickListener(v -> listener.onAcceptOrder(order));
                    btnReject.setOnClickListener(v -> listener.onRejectOrder(order));
                    break;

                case "accepted":
                    actionsAccepted.setVisibility(View.VISIBLE);
                    btnReady.setOnClickListener(v -> listener.onMarkReady(order));
                    break;

                case "ready":
                    actionsReady.setVisibility(View.VISIBLE);
                    btnDelivered.setOnClickListener(v -> listener.onMarkDelivered(order));
                    break;

                case "delivered":
                case "completed":
                case "rejected":
                case "cancelled":
                    // No actions for terminal states
                    break;
            }
        }
    }
}
