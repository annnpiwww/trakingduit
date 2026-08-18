package com.trakingduit.companion.parser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.util.Date

class TransactionParserEngineTest {

    private val parser = TransactionParserEngine()

    @Test
    fun parseBRImoExpense_returnsValidNotification() {
        val result = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Notifikasi Transaksi QRIS di WARUNG ABC sebesar Rp35.000 berhasil."
        )

        assertNotNull(result)
        assertEquals("expense", result?.transactionType)
        assertEquals(35000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("WARUNG ABC", result?.merchantName)
    }

    @Test
    fun parseBCAMobileExpense_returnsValidNotification() {
        val result = parser.parse(
            packageName = "id.co.bca.mobile",
            title = "m-Transfer Notification",
            text = "m-Transfer: Rp50.000 ke 987654321 a/n TOKO MAJU JAYA BERHASIL"
        )

        assertNotNull(result)
        assertEquals("expense", result?.transactionType)
        assertEquals(50000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("TOKO MAJU JAYA", result?.merchantName)
    }

    @Test
    fun parseShopeePayExpense_returnsValidNotification() {
        val result = parser.parse(
            packageName = "com.shopeepay.id",
            title = "Pembayaran Berhasil",
            text = "Kamu berhasil membayar Rp35.000 ke WARUNG ABC memakai ShopeePay."
        )

        assertNotNull(result)
        assertEquals("expense", result?.transactionType)
        assertEquals(35000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("WARUNG ABC", result?.merchantName)
    }

    @Test
    fun parseBRImoIncome_returnsValidNotification() {
        val result = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Transfer masuk sebesar Rp500.000 dari BUDI BERHASIL."
        )

        assertNotNull(result)
        assertEquals("income", result?.transactionType)
        assertEquals(500000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("BUDI", result?.merchantName)
    }

    @Test
    fun sha256HashConsistency_producesDeterministicHash() {
        val fixedDate = Date(1735689600000L) // Fixed timestamp

        val result1 = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Notifikasi Transaksi QRIS di WARUNG ABC sebesar Rp35.000 berhasil.",
            customDate = fixedDate
        )

        val result2 = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Notifikasi Transaksi QRIS di WARUNG ABC sebesar Rp35.000 berhasil.",
            customDate = fixedDate
        )

        assertNotNull(result1)
        assertNotNull(result2)
        assertEquals(result1?.dedupHash, result2?.dedupHash)

        val expectedHash = parser.generateDedupHash(
            packageName = "id.co.bri.brimo",
            type = "expense",
            amount = 35000.0,
            merchantName = "WARUNG ABC",
            date = fixedDate
        )

        assertEquals(expectedHash, result1?.dedupHash)
    }

    @Test
    fun parseUnknownPackage_returnsNull() {
        val result = parser.parse(
            packageName = "com.unknown.app",
            title = "Alert",
            text = "Transaksi berhasil 50000"
        )
        assertNull(result)
    }
}
