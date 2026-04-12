import { useState, useCallback } from "react";

interface UndoAction {
  label: string;
  undo: () => void;
}

export function useUndo() {
  const [stack, setStack] = useState<UndoAction[]>([]);

  const pushUndo = useCallback((action: UndoAction) => {
    setStack((prev) => [...prev.slice(-19), action]); // keep max 20
  }, []);

  const undo = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      last.undo();
      return prev.slice(0, -1);
    });
  }, []);

  const canUndo = stack.length > 0;
  const lastLabel = stack.length > 0 ? stack[stack.length - 1].label : "";

  return { pushUndo, undo, canUndo, lastLabel };
}
