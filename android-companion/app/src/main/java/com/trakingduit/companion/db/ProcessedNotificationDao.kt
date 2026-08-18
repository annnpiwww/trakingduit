package com.trakingduit.companion.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface ProcessedNotificationDao {
    @Query("SELECT EXISTS(SELECT 1 FROM processed_notifications WHERE dedupHash = :hash)")
    suspend fun hasHash(hash: String): Boolean

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: NotificationHashEntity)

    @Query("DELETE FROM processed_notifications WHERE timestamp < :thresholdTimestamp")
    suspend fun deleteOlderThan(thresholdTimestamp: Long)
}
