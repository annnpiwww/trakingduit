package com.trakingduit.companion.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.trakingduit.companion.auth.TokenManager
import com.trakingduit.companion.db.AppDatabase
import com.trakingduit.companion.db.NotificationHashEntity
import com.trakingduit.companion.db.NotificationLogEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

open class IngestWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val appIdentifier = inputData.getString("app_identifier") ?: return@withContext Result.failure()
        val amount = inputData.getDouble("amount", 0.0)
        val type = inputData.getString("type") ?: "expense"
        val merchantName = inputData.getString("merchant_name") ?: "Unknown"
        val dedupHash = inputData.getString("dedup_hash") ?: return@withContext Result.failure()
        val timestamp = inputData.getString("timestamp") ?: ""

        val db = AppDatabase.getInstance(applicationContext)
        val tokenManager = TokenManager(applicationContext)
        val accessToken = tokenManager.accessToken
        val apiUrl = tokenManager.apiUrl

        if (accessToken.isNullOrBlank() || apiUrl.isNullOrBlank()) {
            db.notificationLogDao().insert(
                NotificationLogEntity(
                    packageName = appIdentifier,
                    title = "Ingest Server",
                    status = "UNPAIRED",
                    details = "Gagal Ingest: Token atau API URL kosong. Harap pasangkan ulang perangkat."
                )
            )
            return@withContext Result.failure()
        }

        val targetUrl = "${apiUrl.trimEnd('/')}/api/auto-transactions/ingest"

        try {
            val jsonPayload = JSONObject().apply {
                put("app_identifier", appIdentifier)
                put("amount", amount)
                put("type", type)
                put("merchant_name", merchantName)
                put("dedup_hash", dedupHash)
                put("timestamp", timestamp)
            }

            val url = URL(targetUrl)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $accessToken")
                doOutput = true
                connectTimeout = 15000
                readTimeout = 15000
            }

            OutputStreamWriter(connection.outputStream, "UTF-8").use { os ->
                os.write(jsonPayload.toString())
                os.flush()
            }

            val responseCode = connection.responseCode
            if (responseCode in 200..299 || responseCode == 409) {
                // Successfully ingested or duplicate acknowledged by server -> cache in Room
                db.processedNotificationDao().insert(
                    NotificationHashEntity(
                        dedupHash = dedupHash,
                        packageName = appIdentifier,
                        amount = amount,
                        merchantName = merchantName,
                        timestamp = System.currentTimeMillis()
                    )
                )
                // Cleanup records older than 7 days
                val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
                db.processedNotificationDao().deleteOlderThan(sevenDaysAgo)

                db.notificationLogDao().insert(
                    NotificationLogEntity(
                        packageName = appIdentifier,
                        title = "Ingest Server",
                        status = "INGESTED_OK",
                        details = "Berhasil terkirim ke server (HTTP $responseCode): $merchantName Rp $amount"
                    )
                )
                db.notificationLogDao().trimOldLogs(100)

                Result.success()
            } else if (responseCode in 500..599) {
                db.notificationLogDao().insert(
                    NotificationLogEntity(
                        packageName = appIdentifier,
                        title = "Ingest Server",
                        status = "INGEST_RETRY",
                        details = "Server error (HTTP $responseCode). Akan mencoba lagi."
                    )
                )
                Result.retry()
            } else {
                db.notificationLogDao().insert(
                    NotificationLogEntity(
                        packageName = appIdentifier,
                        title = "Ingest Server",
                        status = "INGEST_FAILED",
                        details = "Gagal kirim ke server (HTTP $responseCode). Mohon cek token/pairing."
                    )
                )
                Result.failure()
            }
        } catch (e: Exception) {
            db.notificationLogDao().insert(
                NotificationLogEntity(
                    packageName = appIdentifier,
                    title = "Ingest Server",
                    status = "INGEST_ERROR",
                    details = "Koneksi Error: ${e.localizedMessage ?: e.message}"
                )
            )
            Result.retry()
        }
    }
}

// Alias for plan consistency
class TransactionIngestWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : IngestWorker(appContext, workerParams)
