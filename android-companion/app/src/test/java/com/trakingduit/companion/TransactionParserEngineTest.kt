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
    fun parseBRImoTransferWithNomorTujuan_withoutRp() {
        val result = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "transfer dari 12345 dengan nomor tujuan 98765 sebesar 20.000 berhasil."
        )

        assertNotNull(result)
        assertEquals("expense", result?.transactionType)
        assertEquals(20000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("98765", result?.merchantName)
    }

    @Test
    fun parseBRImoTransferWithNomorRekeningTujuan_lowercaseRp() {
        val result = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Transfer dari 1234567890 dengan nomor rekening tujuan 9876543210 sebesar rp 10.000.000 berhasil"
        )

        assertNotNull(result)
        assertEquals("expense", result?.transactionType)
        assertEquals(10000000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("9876543210", result?.merchantName)
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

    @Test
    fun parseBRImoWithBigTextAndSubText_returnsValidNotification() {
        val result = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "BRImo",
            text = "",
            subText = "Notifikasi Transaksi",
            bigText = "Transfer masuk sebesar Rp 250.000,00 dari ANITA."
        )

        assertNotNull(result)
        assertEquals("income", result?.transactionType)
        assertEquals(250000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("ANITA", result?.merchantName)
    }

    @Test
    fun parseNumberFormats_cleansCorrectly() {
        // Test 20.000,00 with trailing dot
        val res1 = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Transfer masuk sebesar 20.000,00. dari TOKO 1"
        )
        assertNotNull(res1)
        assertEquals(20000.0, res1?.amount ?: 0.0, 0.01)

        // Test 20.000
        val res2 = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Transfer masuk sebesar Rp 20.000 dari TOKO 2"
        )
        assertNotNull(res2)
        assertEquals(20000.0, res2?.amount ?: 0.0, 0.01)

        // Test US style 20,000.00
        val res3 = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Transfer masuk sebesar Rp 20,000.00 dari TOKO 3"
        )
        assertNotNull(res3)
        assertEquals(20000.0, res3?.amount ?: 0.0, 0.01)
    }
}
