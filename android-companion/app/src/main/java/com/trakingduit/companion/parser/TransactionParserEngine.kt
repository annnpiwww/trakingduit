package com.trakingduit.companion.parser

import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

data class ParsedNotification(
    val packageName: String,
    val transactionType: String, // "expense" | "income"
    val amount: Double,
    val merchantName: String,
    val dedupHash: String,
    val timestamp: String,
    val categoryHint: String? = null
)

data class ParserRule(
    val packageNames: Set<String>,
    val type: String, // "expense" | "income"
    val regex: Pattern,
    val merchantGroup: String,
    val amountGroup: String,
    val categoryHint: String? = null
)

interface NotificationParser {
    fun parse(
        packageName: String,
        title: String,
        text: String,
        subText: String = "",
        bigText: String = "",
        tickerText: String = "",
        customDate: Date? = null
    ): ParsedNotification?
}

class TransactionParserEngine : NotificationParser {

    val rules = listOf(
        // BRImo Income Rule
        ParserRule(
            packageNames = setOf("id.co.bri.brimo"),
            type = "income",
            regex = Pattern.compile("(?i)transfer\\s+masuk\\s+sebesar\\s+(?:Rp\\s*)?(?<amount>[\\d\\.,]+)(?:\\s+dari\\s+(?<merchant>.+))?"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // BRImo QRIS Expense Rule
        ParserRule(
            packageNames = setOf("id.co.bri.brimo"),
            type = "expense",
            regex = Pattern.compile("(?i)(?:Notifikasi\\s+Transaksi\\s+)?QRIS\\s+di\\s+(?<merchant>.+?)\\s+sebesar\\s+(?:Rp\\s*)?(?<amount>[\\d\\.,]+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // BRImo Rule 1: Transfer dengan nomor tujuan
        ParserRule(
            packageNames = setOf("id.co.bri.brimo"),
            type = "expense",
            regex = Pattern.compile("(?i)transfer\\s+(?:dari\\s+.+?\\s+)?(?:dengan|ke)?\\s*(?:nomor\\s+tujuan\\s+)?(?<merchant>.+?)\\s+sebesar\\s+(?:Rp\\s*)?(?<amount>[\\d\\.,]+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // BRImo Rule 2: Transfer/Pembayaran umum expense
        ParserRule(
            packageNames = setOf("id.co.bri.brimo"),
            type = "expense",
            regex = Pattern.compile("(?i)(?:transfer|pembayaran)\\s+(?:keluar|Sdr|QRIS|transaksi|ke)?\\s*(?:di|ke)?\\s*(?<merchant>.+?)\\s+sebesar\\s+(?:Rp\\s*)?(?<amount>[\\d\\.,]+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // BRImo Rule 4: Fallback BRImo amount & merchant
        ParserRule(
            packageNames = setOf("id.co.bri.brimo"),
            type = "expense",
            regex = Pattern.compile("(?i)sebesar\\s+(?:Rp\\s*)?(?<amount>[\\d\\.,]+)\\s+berhasil"),
            merchantGroup = "",
            amountGroup = "amount"
        ),
        // BCA m-Transfer with a/n Expense Rule
        ParserRule(
            packageNames = setOf("id.co.bca.mobile", "id.co.bca.mybca", "com.bca"),
            type = "expense",
            regex = Pattern.compile("(?i)m-Transfer:\\s*Rp\\s*(?<amount>[\\d\\.,]+)\\s+ke\\s+[\\d\\s]+\\s+a/n\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // BCA m-Transfer general Expense Rule
        ParserRule(
            packageNames = setOf("id.co.bca.mobile", "id.co.bca.mybca", "com.bca"),
            type = "expense",
            regex = Pattern.compile("(?i)m-Transfer\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+ke\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // BCA m-Transfer Income Rule
        ParserRule(
            packageNames = setOf("id.co.bca.mobile", "id.co.bca.mybca", "com.bca"),
            type = "income",
            regex = Pattern.compile("(?i)m-Transfer\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+dari\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // ShopeePay Expense Rule 1 (Kamu berhasil / telah membayar)
        ParserRule(
            packageNames = setOf("com.shopeepay.id", "com.shopee.id"),
            type = "expense",
            regex = Pattern.compile("(?i)Kamu\\s+(?:berhasil|telah)\\s+membayar\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+ke\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // ShopeePay Expense Rule 2 (Pembayaran Rp ... berhasil)
        ParserRule(
            packageNames = setOf("com.shopeepay.id", "com.shopee.id"),
            type = "expense",
            regex = Pattern.compile("(?i)Pembayaran\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+berhasil"),
            merchantGroup = "",
            amountGroup = "amount"
        )
    )

    override fun parse(
        packageName: String,
        title: String,
        text: String,
        subText: String,
        bigText: String,
        tickerText: String,
        customDate: Date?
    ): ParsedNotification? {
        val fullContent = listOf(title, text, subText, bigText, tickerText)
            .flatMap { it.split("\n") }
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()
            .joinToString(" ")
            .trim()

        if (fullContent.isBlank()) return null

        for (rule in rules) {
            if (!rule.packageNames.contains(packageName)) continue

            val matcher = rule.regex.matcher(fullContent)
            if (matcher.find()) {
                val rawAmount = matcher.group(rule.amountGroup) ?: continue
                val amount = cleanAndParseAmount(rawAmount) ?: continue

                var merchantName = if (rule.merchantGroup.isNotEmpty()) {
                    matcher.group(rule.merchantGroup) ?: "Unknown Merchant"
                } else {
                    if (packageName.contains("shopee")) "ShopeePay Merchant" else "Unknown Merchant"
                }

                // Sanitize merchant name (strip trailing status words or sentence end markers)
                merchantName = cleanMerchantName(merchantName)

                val now = customDate ?: Date()
                val isoTimestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = java.util.TimeZone.getTimeZone("UTC")
                }.format(now)

                val minuteStr = SimpleDateFormat("yyyyMMddHHmm", Locale.US).format(now)
                val sanitizedMerchantUpper = merchantName.uppercase(Locale.ROOT)
                val formattedAmount = String.format(Locale.US, "%.2f", amount)

                val dedupKey = "$packageName|${rule.type}|$formattedAmount|$sanitizedMerchantUpper|$minuteStr"
                val bytes = MessageDigest.getInstance("SHA-256").digest(dedupKey.toByteArray(Charsets.UTF_8))
                val dedupHash = bytes.joinToString("") { "%02x".format(it) }

                return ParsedNotification(
                    packageName = packageName,
                    transactionType = rule.type,
                    amount = amount,
                    merchantName = merchantName,
                    dedupHash = dedupHash,
                    timestamp = isoTimestamp,
                    categoryHint = rule.categoryHint
                )
            }
        }
        return null
    }

    private fun cleanAndParseAmount(raw: String): Double? {
        var str = raw.trim().trimEnd('.', ',')
        if (str.isEmpty()) return null

        if (str.contains(",") && str.contains(".")) {
            val lastComma = str.lastIndexOf(',')
            val lastDot = str.lastIndexOf('.')
            if (lastComma > lastDot) {
                // Indonesian format: 1.000.000,00 -> remove dots, replace comma with dot
                str = str.replace(".", "").replace(",", ".")
            } else {
                // US format: 1,000,000.00 -> remove commas
                str = str.replace(",", "")
            }
        } else if (str.contains(",")) {
            // Only comma: e.g. 20000,00 -> 20000.00
            str = str.replace(",", ".")
        } else if (str.contains(".")) {
            // Only dot: e.g. 20.000 or 1.500.000 (Indonesian thousands separator)
            val parts = str.split(".")
            if (parts.size > 2 || (parts.size == 2 && parts[1].length == 3)) {
                str = str.replace(".", "")
            } else if (parts.size == 2 && parts[1].length != 3) {
                // e.g. 20000.00 -> keep dot
            } else {
                str = str.replace(".", "")
            }
        }
        return str.toDoubleOrNull()
    }

    private fun cleanMerchantName(raw: String): String {
        var clean = raw.trim()
        // Strip trailing words like "berhasil", "berhasil.", "memakai ShopeePay.", etc.
        clean = clean.replace(Regex("(?i)\\b(?:berhasil|memakai ShopeePay)\\b.*$"), "").trim()
        clean = clean.trimEnd('.', ',', ' ')
        return if (clean.isEmpty()) "Unknown Merchant" else clean
    }

    fun generateDedupHash(packageName: String, type: String, amount: Double, merchantName: String, date: Date): String {
        val minuteStr = SimpleDateFormat("yyyyMMddHHmm", Locale.US).format(date)
        val sanitizedMerchantUpper = cleanMerchantName(merchantName).uppercase(Locale.ROOT)
        val formattedAmount = String.format(Locale.US, "%.2f", amount)
        val dedupKey = "$packageName|$type|$formattedAmount|$sanitizedMerchantUpper|$minuteStr"
        val bytes = MessageDigest.getInstance("SHA-256").digest(dedupKey.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
