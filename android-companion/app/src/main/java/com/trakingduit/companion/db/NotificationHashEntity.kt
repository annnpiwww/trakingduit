package com.trakingduit.companion.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "processed_notifications")
data class NotificationHashEntity(
    @PrimaryKey
    val dedupHash: String,
    val packageName: String,
    val amount: Double,
    val merchantName: String,
    val timestamp: Long = System.currentTimeMillis()
)
