package com.trakingduit.companion.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notification_logs")
data class NotificationLogEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val packageName: String,
    val title: String,
    val status: String,
    val details: String,
    val timestamp: Long = System.currentTimeMillis()
)
