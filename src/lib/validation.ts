import { z } from "zod";

// Transaction validation schema
export const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["income", "expense"]),
  category_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().max(500),
  tags: z.string().max(200).optional(),
  recurring_config: z.string().max(500).optional(),
  deleted: z.union([z.literal(0), z.literal(1)]),
  updated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
  user_id: z.string().uuid().optional(),
});

// Sheet row validation (for Google Sheets sync)
export const sheetRowSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string(),
  amount: z.number().positive().finite(),
  wallet: z.string().max(100),
  to_wallet: z.string().max(100),
  category: z.string().max(100),
  merchant: z.string().max(200),
  note: z.string().max(500),
  source: z.string().max(50),
  updated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
  deleted: z.number().int().min(0).max(1),
});

export const sheetSyncRequestSchema = z.object({
  rows: z.array(sheetRowSchema).max(10000), // Limit 10k rows per sync
});

// Tradu request validation
const traduMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(5_000),
});

const financialContextSchema = z.object({
  totalBalance: z.number().finite().optional(),
  income: z.number().finite().optional(),
  expense: z.number().finite().optional(),
  net: z.number().finite().optional(),
  savingsRate: z.number().finite().optional(),
  avgDailySpend: z.number().finite().optional(),
  projectedMonthEnd: z.number().finite().optional(),
  lastMonthExpense: z.number().finite().optional(),
  lastMonthDelta: z.number().finite().nullable().optional(),
  budgetUsage: z.array(z.object({
    name: z.string().max(200),
    used: z.number().finite(),
  })).max(100).optional(),
  upcomingBills: z.array(z.object({
    name: z.string().max(200),
    daysLeft: z.number().int().finite(),
  })).max(100).optional(),
  topCategories: z.array(z.object({
    name: z.string().max(200),
    total: z.number().finite(),
    share: z.number().finite(),
  })).max(100).optional(),
  recentTransactions: z.array(z.object({
    date: z.string().max(30),
    description: z.string().max(200),
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.number().finite(),
  })).max(100).optional(),
}).optional();

export const traduRequestSchema = z.object({
  messages: z.array(traduMessageSchema).min(1).max(50),
  financialContext: financialContextSchema,
});

// OCR request validation
const imageDataUrlPattern = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const ocrRequestSchema = z.object({
  image: z
    .string()
    .max(10 * 1024 * 1024) // 10MB encoded payload limit
    .regex(imageDataUrlPattern, "Only JPEG, PNG, or WebP image data URLs are accepted"),
  useGoogleVision: z.boolean().optional(),
});

// Insight request validation
export const insightRequestSchema = z.object({
  payload: z.object({
    period: z.string(),
    totalIncome: z.number().nonnegative(),
    totalExpense: z.number().nonnegative(),
    balance: z.number(),
    topCategories: z.array(z.object({
      name: z.string(),
      amount: z.number().nonnegative(),
      count: z.number().int().nonnegative(),
    })).max(20),
    monthlyTrend: z.array(z.object({
      month: z.string(),
      income: z.number().nonnegative(),
      expense: z.number().nonnegative(),
    })).max(24),
  }),
});

// Analytics query validation
export const analyticsQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Generic error response
export function createErrorResponse(message: string) {
  return {
    error: process.env.NODE_ENV === "production" 
      ? "An error occurred" 
      : message,
    ...(process.env.NODE_ENV !== "production" && { details: message }),
  };
}
