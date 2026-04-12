export interface JournalEntry {
  id: string;
  gardenId: string;
  date: string;
  title: string;
  text: string;
  tags?: string[];
  bedId?: string;
  plantId?: string;
}
