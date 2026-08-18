package com.trakingduit.app.plugins

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.trakingduit.app.service.BankNotificationService

@CapacitorPlugin(name = "NotificationListener")
class NotificationListenerPlugin : Plugin() {

    override fun load() {
        super.load()
        BankNotificationService.setPluginInstance(this)
    }

    override fun handleOnDestroy() {
        BankNotificationService.setPluginInstance(null)
        super.handleOnDestroy()
    }

    @PluginMethod
    fun isPermissionGranted(call: PluginCall) {
        checkPermission(call)
    }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        try {
            val ctx: Context = context
            val packageName = ctx.packageName
            val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(ctx)
            val isGranted = enabledPackages.contains(packageName)

            val ret = JSObject().apply {
                put("granted", isGranted)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            val ret = JSObject().apply {
                put("granted", false)
                put("error", e.message)
            }
            call.resolve(ret)
        }
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            
            val currentActivity = activity ?: bridge?.activity
            if (currentActivity != null) {
                currentActivity.startActivity(intent)
            } else {
                context.startActivity(intent)
            }

            val ret = JSObject().apply {
                put("requested", true)
                put("granted", false)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            // Fallback for devices with custom settings actions
            try {
                val fallbackIntent = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                
                val ret = JSObject().apply {
                    put("requested", true)
                    put("fallback", true)
                }
                call.resolve(ret)
            } catch (err: Exception) {
                call.reject("Tidak dapat membuka pengaturan: " + err.message)
            }
        }
    }

    @PluginMethod
    fun getPendingNotifications(call: PluginCall) {
        val pendingList = BankNotificationService.popPendingNotifications()
        val array = JSArray()
        for (item in pendingList) {
            array.put(item)
        }

        val ret = JSObject().apply {
            put("notifications", array)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun getLogs(call: PluginCall) {
        getPendingNotifications(call)
    }

    fun emitBankNotification(data: JSObject) {
        notifyListeners("bankNotificationReceived", data)
    }
}
