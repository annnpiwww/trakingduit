"use client";

import {
  Banknote,
  Building2,
  CarFront,
  CirclePlus,
  Clapperboard,
  CreditCard,
  Ellipsis,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  LaptopMinimal,
  PiggyBank,
  PlaneLanding,
  ReceiptText,
  ShoppingBasket,
  SmartphoneNfc,
  Target,
  TrendingUp,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  banknote: Banknote,
  bank: Building2,
  car: CarFront,
  "circle-plus": CirclePlus,
  clapperboard: Clapperboard,
  "credit-card": CreditCard,
  ellipsis: Ellipsis,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  home: Home,
  landmark: Landmark,
  laptop: LaptopMinimal,
  "piggy-bank": PiggyBank,
  plane: PlaneLanding,
  receipt: ReceiptText,
  "shopping-bag": ShoppingBasket,
  smartphone: SmartphoneNfc,
  target: Target,
  "trending-up": TrendingUp,
  utensils: UtensilsCrossed,
  wallet: WalletCards,
};

export const ICON_NAMES = Object.keys(MAP);

export function DynIcon({ name, className }: { name?: string; className?: string }) {
  const Cmp = (name && MAP[name]) || Ellipsis;
  return <Cmp className={className} />;
}
