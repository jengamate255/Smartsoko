package com.smartsoko.merchant.ui.products;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.smartsoko.merchant.R;
import com.smartsoko.merchant.data.model.Product;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ProductsAdapter extends RecyclerView.Adapter<ProductsAdapter.ProductViewHolder> {

    public interface OnProductEditListener {
        void onEdit(Product product);
    }

    private final List<Product> items = new ArrayList<>();
    private final OnProductEditListener editListener;

    public ProductsAdapter(OnProductEditListener editListener) {
        this.editListener = editListener;
    }

    public void submit(List<Product> products) {
        items.clear();
        items.addAll(products);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ProductViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_product, parent, false);
        return new ProductViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ProductViewHolder holder, int position) {
        holder.bind(items.get(position));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    class ProductViewHolder extends RecyclerView.ViewHolder {

        private final ImageView image;
        private final TextView badge;
        private final View soldOverlay;
        private final TextView name;
        private final TextView category;
        private final TextView stock;
        private final TextView price;
        private final View editButton;

        ProductViewHolder(@NonNull View itemView) {
            super(itemView);
            image = itemView.findViewById(R.id.iv_product_image);
            badge = itemView.findViewById(R.id.tv_badge);
            soldOverlay = itemView.findViewById(R.id.sold_overlay);
            name = itemView.findViewById(R.id.tv_name);
            category = itemView.findViewById(R.id.tv_category);
            stock = itemView.findViewById(R.id.tv_stock);
            price = itemView.findViewById(R.id.tv_price);
            editButton = itemView.findViewById(R.id.btn_edit);
        }

        void bind(Product product) {
            name.setText(product.getName());
            String cat = product.getCategory();
            category.setText(cat == null || cat.isEmpty() ? "No category" : cat);
            price.setText(String.format(Locale.US, "TSh %.2f", product.getPrice()));

            boolean unavailable = !product.isAvailable();
            int qty = product.getStockQuantity();

            soldOverlay.setVisibility(unavailable ? View.VISIBLE : View.GONE);
            image.clearColorFilter();

            if (unavailable) {
                badge.setVisibility(View.GONE);
                stock.setText("0 units");
                stock.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.text_secondary));
            } else if (qty > 0 && qty <= 10) {
                badge.setVisibility(View.VISIBLE);
                badge.setText("LOW STOCK");
                stock.setText(qty + " units left");
                stock.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.error));
            } else if (qty > 10) {
                badge.setVisibility(View.GONE);
                stock.setText(qty + " units");
                stock.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.primary));
            } else {
                // available but no tracked stock quantity
                badge.setVisibility(View.GONE);
                stock.setText("--");
                stock.setTextColor(ContextCompat.getColor(itemView.getContext(), R.color.text_secondary));
            }

            String imageUrl = product.getDisplayImageUrl();
            if (imageUrl != null && imageUrl.startsWith("http")) {
                Glide.with(image)
                        .load(imageUrl)
                        .placeholder(R.drawable.ic_products)
                        .error(R.drawable.ic_products)
                        .centerCrop()
                        .into(image);
            } else {
                image.setImageResource(R.drawable.ic_products);
            }

            editButton.setOnClickListener(v -> {
                if (editListener != null) editListener.onEdit(product);
            });
        }
    }
}
