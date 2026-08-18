package com.trakingduit.companion.service

import android.app.Notification
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

        if (title.isBlank() && text.isBlank() && subText.isBlank() && effectiveBigText.isBlank() && tickerText.isBlank()) return

        serviceScope.launch {
            val parsedResult = parserEngine.parse(
                packageName = packageName,
                title = title,
                text = text,
                subText = subText,
                bigText = effectiveBigText,
                tickerText = tickerText
            ) ?: return@launch

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
