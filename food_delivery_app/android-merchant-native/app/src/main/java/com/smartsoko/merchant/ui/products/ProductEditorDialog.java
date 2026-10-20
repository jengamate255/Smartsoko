package com.smartsoko.merchant.ui.products;

import android.app.Dialog;
import android.content.Context;
import android.text.TextUtils;
import android.view.View;
import android.view.Window;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.smartsoko.merchant.R;
import com.smartsoko.merchant.data.model.Product;

public class ProductEditorDialog {

    public interface Callbacks {
        void onSave(Product product);
        void onDelete(Product product);
    }

    public static void show(Context context, Product existing, Callbacks callbacks) {
        final boolean isNew = existing == null;
        final Product product = isNew ? new Product() : existing;

        Dialog dialog = new Dialog(context);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_product_editor);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout(
                    (int) (context.getResources().getDisplayMetrics().widthPixels * 0.95),
                    android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        TextView title = dialog.findViewById(R.id.tv_dialog_title);
        EditText etName = dialog.findViewById(R.id.et_name);
        EditText etPrice = dialog.findViewById(R.id.et_price);
        EditText etStock = dialog.findViewById(R.id.et_stock);
        EditText etCategory = dialog.findViewById(R.id.et_category);
        EditText etImageUrl = dialog.findViewById(R.id.et_image_url);
        EditText etDescription = dialog.findViewById(R.id.et_description);
        SwitchMaterial switchAvailable = dialog.findViewById(R.id.switch_available);
        MaterialButton btnSave = dialog.findViewById(R.id.btn_save);
        MaterialButton btnDelete = dialog.findViewById(R.id.btn_delete);

        title.setText(isNew ? "Add product" : "Edit product");
        if (!isNew) {
            etName.setText(product.getName());
            etPrice.setText(String.valueOf(product.getPrice()));
            if (product.getStockQuantity() > 0) {
                etStock.setText(String.valueOf(product.getStockQuantity()));
            }
            etCategory.setText(product.getCategory());
            etImageUrl.setText(product.getImageUrl());
            etDescription.setText(product.getDescription());
            switchAvailable.setChecked(product.isAvailable());
            btnDelete.setVisibility(View.VISIBLE);
        }

        btnDelete.setOnClickListener(v -> {
            dialog.dismiss();
            callbacks.onDelete(product);
        });

        btnSave.setOnClickListener(v -> {
            String name = etName.getText().toString().trim();
            String priceStr = etPrice.getText().toString().trim();
            if (TextUtils.isEmpty(name)) {
                etName.setError("Required");
                return;
            }
            double price;
            try {
                price = Double.parseDouble(priceStr);
            } catch (NumberFormatException e) {
                etPrice.setError("Enter a valid price");
                return;
            }
            int stockQty = 0;
            String stockStr = etStock.getText().toString().trim();
            if (!TextUtils.isEmpty(stockStr)) {
                try {
                    stockQty = (int) Double.parseDouble(stockStr);
                } catch (NumberFormatException e) {
                    etStock.setError("Enter a number");
                    return;
                }
            }

            product.setName(name);
            product.setPrice(price);
            product.setStockQuantity(stockQty);
            product.setCategory(etCategory.getText().toString().trim());
            product.setImageUrl(etImageUrl.getText().toString().trim());
            product.setDescription(etDescription.getText().toString().trim());
            product.setAvailable(switchAvailable.isChecked());

            dialog.dismiss();
            callbacks.onSave(product);
        });

        dialog.show();
    }
}
