package com.trakingduit.companion.ui

import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.switchmaterial.SwitchMaterial
import com.trakingduit.companion.R
import com.trakingduit.companion.auth.TokenManager
import com.trakingduit.companion.db.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var switchNotificationAccess: SwitchMaterial
    private lateinit var tvStatus: TextView
    private lateinit var btnScanQr: Button
    private lateinit var btnSaveManualPairing: Button
    private lateinit var etManualPairingJson: EditText

    private lateinit var tvLogHeader: TextView
    private lateinit var tvLogHistory: TextView
    private lateinit var btnRefreshLogs: Button
    private lateinit var btnClearLogs: Button

    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tokenManager = TokenManager(this)

        switchNotificationAccess = findViewById(R.id.switchNotificationAccess)
        tvStatus = findViewById(R.id.tvStatus)
        btnScanQr = findViewById(R.id.btnScanQr)
        btnSaveManualPairing = findViewById(R.id.btnSaveManualPairing)
        etManualPairingJson = findViewById(R.id.etManualPairingJson)

        tvLogHeader = findViewById(R.id.tvLogHeader)
        tvLogHistory = findViewById(R.id.tvLogHistory)
        btnRefreshLogs = findViewById(R.id.btnRefreshLogs)
        btnClearLogs = findViewById(R.id.btnClearLogs)

        switchNotificationAccess.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked != isNotificationServiceEnabled()) {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        }

        btnScanQr.setOnClickListener {
            Toast.makeText(this, "QR Scanner: Gunakan fitur paste JSON di bawah jika kamera belum aktif", Toast.LENGTH_LONG).show()
        }

        btnSaveManualPairing.setOnClickListener {
            val jsonText = etManualPairingJson.text.toString().trim()
            if (jsonText.isEmpty()) {
                Toast.makeText(this, "Masukkan JSON pairing data", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            try {
                val json = JSONObject(jsonText)
                val accessToken = json.optString("access_token")
                val refreshToken = json.optString("refresh_token")
                val apiUrl = json.optString("api_url")
                val supabaseUrl = json.optString("supabase_url")

                if (accessToken.isNullOrBlank() || apiUrl.isNullOrBlank()) {
                    Toast.makeText(this, "JSON pairing tidak valid", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                tokenManager.savePairingData(accessToken, refreshToken, apiUrl, supabaseUrl)
                Toast.makeText(this, "Perangkat berhasil dipasangkan!", Toast.LENGTH_SHORT).show()
                updateUiState()
            } catch (e: Exception) {
                Toast.makeText(this, "Format JSON tidak valid: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }

        btnRefreshLogs.setOnClickListener {
            loadDiagnosticLogs()
        }

        btnClearLogs.setOnClickListener {
            lifecycleScope.launch(Dispatchers.IO) {
                AppDatabase.getInstance(applicationContext).notificationLogDao().clearAll()
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@MainActivity, "Log berhasil dihapus", Toast.LENGTH_SHORT).show()
                    loadDiagnosticLogs()
                }
            }
        }

        updateUiState()
    }

    override fun onResume() {
        super.onResume()
        updateUiState()
    }

    private fun updateUiState() {
        val enabled = isNotificationServiceEnabled()
        switchNotificationAccess.isChecked = enabled

        val isPaired = !tokenManager.accessToken.isNullOrEmpty()
        val statusMessage = buildString {
            append("Izin Notifikasi: ").append(if (enabled) "AKTIF ✅" else "NONAKTIF ❌").append("\n")
            append("Status Pairing: ").append(if (isPaired) "TERPASANG ✅" else "BELUM PAIRING ❌")
        }
        tvStatus.text = statusMessage

        loadDiagnosticLogs()
    }

    private fun loadDiagnosticLogs() {
        lifecycleScope.launch(Dispatchers.IO) {
            val db = AppDatabase.getInstance(applicationContext)
            val logs = db.notificationLogDao().getRecentLogs(50)
            val totalCount = db.notificationLogDao().getLogCount()

            val formattedText = if (logs.isEmpty()) {
                "Belum ada log notifikasi yang tertangkap."
            } else {
                logs.joinToString("\n\n") { log ->
                    val timeStr = timeFormat.format(Date(log.timestamp))
                    "[$timeStr] [${log.status}]\nPkg: ${log.packageName}\nDetail: ${log.details}"
                }
            }

            withContext(Dispatchers.Main) {
                tvLogHeader.text = "Diagnostic Log Notifikasi ($totalCount logs)"
                tvLogHistory.text = formattedText
            }
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        if (!TextUtils.isEmpty(flat)) {
            val names = flat.split(":")
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && TextUtils.equals(pkgName, cn.packageName)) {
                    return true
                }
            }
        }
        return false
    }
}
