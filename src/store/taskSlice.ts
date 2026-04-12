import type { StateCreator } from "zustand";
import type { Task, TaskType } from "@/types/task";

export interface TaskSlice {
  tasks: Task[];
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  generateTasks: (gardenId: string, plantings: Array<{ plantId: string; bedId: string; type: TaskType; title: string; dueDate: string }>) => void;
}

let nextId = Date.now();
const genId = () => `task-${nextId++}`;

export const createTaskSlice: StateCreator<TaskSlice> = (set) => ({
  tasks: [],

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: genId() }],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),

  completeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completedDate: new Date().toISOString() } : t
      ),
    })),

  generateTasks: (gardenId, plantings) =>
    set((state) => ({
      tasks: [
        ...state.tasks.filter((t) => t.gardenId !== gardenId),
        ...plantings.map((p) => ({
          id: genId(),
          gardenId,
          plantId: p.plantId,
          bedId: p.bedId,
          type: p.type,
          title: p.title,
          dueDate: p.dueDate,
        })),
      ],
    })),
});
