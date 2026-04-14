export type ExpenseCategory = "seeds" | "soil" | "tools" | "fertilizer" | "infrastructure" | "water" | "animal_feed" | "veterinary" | "other";

export interface Expense {
  id: string;
  gardenId: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amountCents: number;
}
