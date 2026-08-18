package com.trakingduit.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.trakingduit.app.plugins.NotificationListenerPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(NotificationListenerPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
