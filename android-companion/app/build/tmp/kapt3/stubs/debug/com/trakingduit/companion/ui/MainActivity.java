package com.trakingduit.companion.ui;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000@\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000b\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0003\u0018\u00002\u00020\u0001B\u0005\u00a2\u0006\u0002\u0010\u0002J\b\u0010\u000e\u001a\u00020\u000fH\u0002J\u0012\u0010\u0010\u001a\u00020\u00112\b\u0010\u0012\u001a\u0004\u0018\u00010\u0013H\u0014J\b\u0010\u0014\u001a\u00020\u0011H\u0014J\b\u0010\u0015\u001a\u00020\u0011H\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0007X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\b\u001a\u00020\tX\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\n\u001a\u00020\u000bX\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\f\u001a\u00020\rX\u0082.\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0016"}, d2 = {"Lcom/trakingduit/companion/ui/MainActivity;", "Landroidx/appcompat/app/AppCompatActivity;", "()V", "btnSaveManualPairing", "Landroid/widget/Button;", "btnScanQr", "etManualPairingJson", "Landroid/widget/EditText;", "switchNotificationAccess", "Lcom/google/android/material/switchmaterial/SwitchMaterial;", "tokenManager", "Lcom/trakingduit/companion/auth/TokenManager;", "tvStatus", "Landroid/widget/TextView;", "isNotificationServiceEnabled", "", "onCreate", "", "savedInstanceState", "Landroid/os/Bundle;", "onResume", "updateUiState", "app_debug"})
public final class MainActivity extends androidx.appcompat.app.AppCompatActivity {
    private com.trakingduit.companion.auth.TokenManager tokenManager;
    private com.google.android.material.switchmaterial.SwitchMaterial switchNotificationAccess;
    private android.widget.TextView tvStatus;
    private android.widget.Button btnScanQr;
    private android.widget.Button btnSaveManualPairing;
    private android.widget.EditText etManualPairingJson;
    
    public MainActivity() {
        super();
    }
    
    @java.lang.Override()
    protected void onCreate(@org.jetbrains.annotations.Nullable()
    android.os.Bundle savedInstanceState) {
    }
    
    @java.lang.Override()
    protected void onResume() {
    }
    
    private final void updateUiState() {
    }
    
    private final boolean isNotificationServiceEnabled() {
        return false;
    }
}