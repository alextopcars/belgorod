export type VehicleStatus = "available" | "on_order" | "reserved" | "sold" | "draft";
export type VehicleSource = "manual" | "avito" | "telegram";

export interface Vehicle {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number | null;
  priceAmount: number;
  currency: "RUB" | "CNY" | "KRW" | "EUR" | "USD";
  status: VehicleStatus;
  source: VehicleSource;
  sourceExternalId?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}
