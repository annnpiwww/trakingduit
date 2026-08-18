package com.trakingduit.companion.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.trakingduit.companion.auth.TokenManager
import com.trakingduit.companion.db.AppDatabase
import com.trakingduit.companion.db.NotificationLogEntity
import com.trakingduit.companion.parser.TransactionParserEngine
import com.trakingduit.companion.worker.IngestWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class CompanionNotificationListenerService : NotificationListenerService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val parserEngine = TransactionParserEngine()

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        val sbnNotNull = sbn ?: return
        val packageName = sbnNotNull.packageName ?: return

        val notification = sbnNotNull.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

        val textLinesRaw = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        val textLines = textLinesRaw?.filterNotNull()?.joinToString(" ") ?: ""

        val tickerText = notification.tickerText?.toString() ?: ""
        val effectiveBigText = listOf(bigText, textLines).filter { it.isNotBlank() }.joinToString(" ")

        val isWhitelisted = TransactionParserEngine.isWhitelistedPackage(packageName)

        serviceScope.launch {
            val db = AppDatabase.getInstance(applicationContext)

            if (!isWhitelisted) {
                // Log non-whitelisted notification so user can see it arrived
                db.notificationLogDao().insert(
                    NotificationLogEntity(
                        packageName = packageName,
                        title = title.ifBlank { "No Title" },
                        status = "NON_BANK",
                        details = "Diabaikan: Package '$packageName' tidak ada di whitelist bank"
                    )
                )
                db.notificationLogDao().trimOldLogs(100)
                return@launch
            }

            if (title.isBlank() && text.isBlank() && subText.isBlank() && effectiveBigText.isBlank() && tickerText.isBlank()) {
                db.notificationLogDao().insert(
                    NotificationLogEntity(
                        packageName = packageName,
                        title = "Kosong",
                        status = "IGNORED_EMPTY",
                        details = "Diabaikan: Teks dan konten notifikasi kosong"
                    )
                )
                db.notificationLogDao().trimOldLogs(100)
                return@launch
            }

            val tokenManager = TokenManager(applicationContext)
            val isPaired = !tokenManager.accessToken.isNullOrBlank()

            val parsedResult = parserEngine.parse(
                packageName = packageName,
                title = title,
                text = text,
                subText = subText,
                bigText = effectiveBigText,
                tickerText = tickerText
            )

            if (parsedResult == null) {
                db.notificationLogDao().insert(
                    NotificationLogEntity(
                        packageName = packageName,
                        title = title.ifBlank { "Notifikasi Bank" },
                        status = "FAILED_PARSE",
                        details = "Gagal: Format pesan tidak cocok dengan regex transaksi (${text.take(60)})"
                    )
                )
                db.notificationLogDao().trimOldLogs(100)
                return@launch
            }

            if (!isPaired) {
                db.notificationLogDao().insert(
                    NotificationLogEntity(
                        packageName = packageName,
                        title = title.ifBlank { "Notifikasi Transaksi" },
                        status = "UNPAIRED",
                        details = "Gagal Ingest: Perangkat BELUM DIPASANGKAN (Access Token Kosong). Rp ${parsedResult.amount} (${parsedResult.merchantName})"
                    )
                )
                db.notificationLogDao().trimOldLogs(100)
                return@launch
            }

            val alreadyProcessed = db.processedNotificationDao().hasHash(parsedResult.dedupHash)
            if (alreadyProcessed) {
                db.notificationLogDao().insert(
                    NotificationLogEntity(
                        packageName = packageName,
                        title = title.ifBlank { "Notifikasi Transaksi" },
                        status = "DUPLICATE",
                        details = "Diabaikan: Transaksi duplikat sudah pernah diproses. Rp ${parsedResult.amount} (${parsedResult.merchantName})"
                    )
                )
                db.notificationLogDao().trimOldLogs(100)
                return@launch
            }

            // Successfully parsed & paired -> Enqueue worker
            val workData = workDataOf(
                "app_identifier" to parsedResult.packageName,
                "amount" to parsedResult.amount,
                "type" to parsedResult.transactionType,
                "merchant_name" to parsedResult.merchantName,
                "dedup_hash" to parsedResult.dedupHash,
                "timestamp" to parsedResult.timestamp
            )

            val workRequest = OneTimeWorkRequestBuilder<IngestWorker>()
                .setInputData(workData)
                .build()

            WorkManager.getInstance(applicationContext).enqueue(workRequest)

            db.notificationLogDao().insert(
                NotificationLogEntity(
                    packageName = packageName,
                    title = title.ifBlank { "Notifikasi Transaksi" },
                    status = "PARSED",
                    details = "Berhasil diparse & dijadwalkan: ${parsedResult.transactionType.uppercase()} Rp ${parsedResult.amount} di ${parsedResult.merchantName}"
                )
            )
            db.notificationLogDao().trimOldLogs(100)
        }
    }
}
