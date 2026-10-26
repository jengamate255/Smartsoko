package com.smartsoko.merchant.ui.settings;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.smartsoko.merchant.R;
import com.smartsoko.merchant.ui.login.LoginActivity;
import com.smartsoko.merchant.viewmodel.MerchantViewModel;

public class SettingsFragment extends Fragment {

    private TextView tvStoreName, tvEmail;
    private Button btnLogout, btnEditStore;
    private MerchantViewModel viewModel;
    private FirebaseAuth firebaseAuth;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(requireActivity()).get(MerchantViewModel.class);
        firebaseAuth = FirebaseAuth.getInstance();
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                            @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_settings, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        tvStoreName = view.findViewById(R.id.tv_store_name);
        tvEmail = view.findViewById(R.id.tv_email);
        btnLogout = view.findViewById(R.id.btn_logout);
        btnEditStore = view.findViewById(R.id.btn_edit_store);

        FirebaseUser user = firebaseAuth.getCurrentUser();
        if (user != null) {
            tvEmail.setText(user.getEmail());
        }

        viewModel.getStoreName().observe(getViewLifecycleOwner(), storeName -> {
            if (storeName != null) {
                tvStoreName.setText(storeName);
            }
        });

        btnLogout.setOnClickListener(v -> {
            firebaseAuth.signOut();
            startActivity(new Intent(requireContext(), LoginActivity.class));
            requireActivity().finish();
        });

        btnEditStore.setOnClickListener(v -> {
            android.widget.EditText name = new android.widget.EditText(requireContext());
            name.setSingleLine(true);
            name.setText(viewModel.getStoreName().getValue());
            name.setHint(R.string.label_store_name);
            androidx.appcompat.app.AlertDialog dialog = new androidx.appcompat.app.AlertDialog.Builder(requireContext())
                .setTitle(R.string.dialog_edit_store_name).setView(name)
                .setNegativeButton(R.string.action_cancel, null).setPositiveButton(R.string.action_save, null).create();
            dialog.setOnShowListener(ignored -> dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener(save -> {
                if (name.getText().toString().trim().isEmpty()) { name.setError(getString(R.string.error_enter_store_name)); return; }
                dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_POSITIVE).setEnabled(false);
                viewModel.updateStoreName(name.getText().toString())
                    .addOnSuccessListener(result -> { if (isAdded()) Toast.makeText(requireContext(), R.string.msg_store_updated, Toast.LENGTH_SHORT).show(); dialog.dismiss(); })
                    .addOnFailureListener(error -> { dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_POSITIVE).setEnabled(true); name.setError(getString(R.string.error_save_store_retry)); });
            }));
            dialog.show();
        });
    }
}
