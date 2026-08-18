package com.trakingduit.companion.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface NotificationLogDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: NotificationLogEntity)

    @Query("SELECT * FROM notification_logs ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentLogs(limit: Int = 50): List<NotificationLogEntity>

    @Query("SELECT COUNT(*) FROM notification_logs")
    suspend fun getLogCount(): Int

    @Query("DELETE FROM notification_logs")
    suspend fun clearAll()

    @Query("DELETE FROM notification_logs WHERE id NOT IN (SELECT id FROM notification_logs ORDER BY timestamp DESC LIMIT :keepLimit)")
    suspend fun trimOldLogs(keepLimit: Int = 100)
}
