import type { StateCreator } from "zustand";
import type { Expense } from "@/types/expense";

export interface ExpenseSlice {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => void;
  deleteExpense: (id: string) => void;
}

let nextId = Date.now();
const genId = () => `expense-${nextId++}`;

export const createExpenseSlice: StateCreator<ExpenseSlice> = (set) => ({
  expenses: [],

  addExpense: (expense) =>
    set((state) => ({
      expenses: [...state.expenses, { ...expense, id: genId() }],
    })),

  deleteExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    })),
});
