package com.trakingduit.companion.parser;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00006\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010 \n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010\u000e\n\u0002\b\u0005\n\u0002\u0010\u0006\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0004\u0018\u00002\u00020\u0001B\u0005\u00a2\u0006\u0002\u0010\u0002J\u0010\u0010\b\u001a\u00020\t2\u0006\u0010\n\u001a\u00020\tH\u0002J.\u0010\u000b\u001a\u00020\t2\u0006\u0010\f\u001a\u00020\t2\u0006\u0010\r\u001a\u00020\t2\u0006\u0010\u000e\u001a\u00020\u000f2\u0006\u0010\u0010\u001a\u00020\t2\u0006\u0010\u0011\u001a\u00020\u0012J,\u0010\u0013\u001a\u0004\u0018\u00010\u00142\u0006\u0010\f\u001a\u00020\t2\u0006\u0010\u0015\u001a\u00020\t2\u0006\u0010\u0016\u001a\u00020\t2\b\u0010\u0017\u001a\u0004\u0018\u00010\u0012H\u0016R\u0017\u0010\u0003\u001a\b\u0012\u0004\u0012\u00020\u00050\u0004\u00a2\u0006\b\n\u0000\u001a\u0004\b\u0006\u0010\u0007\u00a8\u0006\u0018"}, d2 = {"Lcom/trakingduit/companion/parser/TransactionParserEngine;", "Lcom/trakingduit/companion/parser/NotificationParser;", "()V", "rules", "", "Lcom/trakingduit/companion/parser/ParserRule;", "getRules", "()Ljava/util/List;", "cleanMerchantName", "", "raw", "generateDedupHash", "packageName", "type", "amount", "", "merchantName", "date", "Ljava/util/Date;", "parse", "Lcom/trakingduit/companion/parser/ParsedNotification;", "title", "text", "customDate", "app_release"})
public final class TransactionParserEngine implements com.trakingduit.companion.parser.NotificationParser {
    @org.jetbrains.annotations.NotNull()
    private final java.util.List<com.trakingduit.companion.parser.ParserRule> rules = null;
    
    public TransactionParserEngine() {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.util.List<com.trakingduit.companion.parser.ParserRule> getRules() {
        return null;
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.Nullable()
    public com.trakingduit.companion.parser.ParsedNotification parse(@org.jetbrains.annotations.NotNull()
    java.lang.String packageName, @org.jetbrains.annotations.NotNull()
    java.lang.String title, @org.jetbrains.annotations.NotNull()
    java.lang.String text, @org.jetbrains.annotations.Nullable()
    java.util.Date customDate) {
        return null;
    }
    
    private final java.lang.String cleanMerchantName(java.lang.String raw) {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String generateDedupHash(@org.jetbrains.annotations.NotNull()
    java.lang.String packageName, @org.jetbrains.annotations.NotNull()
    java.lang.String type, double amount, @org.jetbrains.annotations.NotNull()
    java.lang.String merchantName, @org.jetbrains.annotations.NotNull()
    java.util.Date date) {
        return null;
    }
}