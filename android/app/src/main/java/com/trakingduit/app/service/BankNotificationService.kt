package com.trakingduit.app.service

import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.getcapacitor.JSObject
import com.trakingduit.app.plugins.NotificationListenerPlugin
import java.util.concurrent.ConcurrentLinkedQueue

class BankNotificationService : NotificationListenerService() {

    companion object {
        private val pendingNotifications = ConcurrentLinkedQueue<JSObject>()
        private var pluginInstance: NotificationListenerPlugin? = null

        fun setPluginInstance(instance: NotificationListenerPlugin?) {
            pluginInstance = instance
        }

        fun popPendingNotifications(): List<JSObject> {
            val list = mutableListOf<JSObject>()
            while (pendingNotifications.isNotEmpty()) {
                pendingNotifications.poll()?.let { list.add(it) }
            }
            return list
        }

        val SUPPORTED_PACKAGES = setOf(
            "com.bca",                  // m-BCA / BCA Mobile
            "com.bca.mobile",           // BCA Mobile alternate
            "id.bmri.livin",            // Livin' by Mandiri
            "id.co.bri.brimo",          // BRImo
            "id.bni.mobile.banking",    // BNI Mobile Banking
            "com.gojek.app",            // GoPay / Gojek
            "com.ovo.id",               // OVO
            "id.dana",                  // DANA
            "com.shopee.id"             // ShopeePay / Shopee
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        if (!SUPPORTED_PACKAGES.contains(packageName)) return

        val extras: Bundle = sbn.notification.extras ?: return
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val postTime = sbn.postTime

        if (title.isEmpty() && text.isEmpty()) return

        val data = JSObject().apply {
            put("id", sbn.id.toString())
            put("packageName", packageName)
            put("title", title)
            put("text", text)
            put("postTime", postTime)
        }

        val plugin = pluginInstance
        if (plugin != null) {
            plugin.emitBankNotification(data)
        } else {
            pendingNotifications.add(data)
        }
    }
}
