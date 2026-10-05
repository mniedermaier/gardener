import { useState, useCallback, useRef } from "react";

interface UndoAction {
  label: string;
  undo: () => void;
}

/**
 * Small per-component undo stack (max 20). The stack lives in a ref so the
 * undo side effect runs exactly once — calling it inside a state updater ran
 * it twice under StrictMode.
 */
export function useUndo() {
  const stack = useRef<UndoAction[]>([]);
  const [size, setSize] = useState(0);

  const pushUndo = useCallback((action: UndoAction) => {
    stack.current = [...stack.current.slice(-19), action];
    setSize(stack.current.length);
  }, []);

  const undo = useCallback(() => {
    const last = stack.current.pop();
    setSize(stack.current.length);
    last?.undo();
  }, []);

  return { pushUndo, undo, canUndo: size > 0 };
}
