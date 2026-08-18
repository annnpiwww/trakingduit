package com.trakingduit.companion.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.trakingduit.companion.db.AppDatabase
import com.trakingduit.companion.parser.TransactionParserEngine
import com.trakingduit.companion.worker.IngestWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class CompanionNotificationListenerService : NotificationListenerService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val parserEngine = TransactionParserEngine()

    private val whitelistedPackages = setOf(
        "id.co.bri.brimo",
        "id.co.bca.mobile",
        "id.co.bca.mybca",
        "com.bca",
        "com.shopeepay.id",
        "com.shopee.id"
    )

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        val sbnNotNull = sbn ?: return
        val packageName = sbnNotNull.packageName ?: return

        if (!whitelistedPackages.contains(packageName)) return

        val extras = sbnNotNull.notification?.extras ?: return
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        if (title.isBlank() && text.isBlank()) return

        serviceScope.launch {
            val parsedResult = parserEngine.parse(packageName, title, text) ?: return@launch

            val db = AppDatabase.getInstance(applicationContext)
            val alreadyProcessed = db.processedNotificationDao().hasHash(parsedResult.dedupHash)
            if (alreadyProcessed) return@launch

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
        }
    }
}
