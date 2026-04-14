export type TaskType =
  | "sow_indoors"
  | "sow_outdoors"
  | "transplant"
  | "water"
  | "harvest"
  | "fertilize"
  | "scout"
  | "preserve"
  | "soil_test"
  | "custom";

export interface Task {
  id: string;
  gardenId: string;
  plantId?: string;
  bedId?: string;
  type: TaskType;
  title: string;
  description?: string;
  dueDate: string;
  completedDate?: string;
  recurring?: {
    interval: "daily" | "weekly" | "biweekly";
    until?: string;
  };
}
