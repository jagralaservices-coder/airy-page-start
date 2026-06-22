import { useState, useCallback, useRef } from 'react';
import { UICustomizationConfig } from '@/hooks/useUICustomization';

export function useEditMode() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const snapshotRef = useRef<UICustomizationConfig | null>(null);
  const historyRef = useRef<UICustomizationConfig[]>([]);
  const historyIndexRef = useRef(-1);

  const enterEditMode = useCallback((currentConfig: UICustomizationConfig) => {
    snapshotRef.current = JSON.parse(JSON.stringify(currentConfig));
    historyRef.current = [JSON.parse(JSON.stringify(currentConfig))];
    historyIndexRef.current = 0;
    setIsEditMode(true);
    setHasChanges(false);
  }, []);

  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  const pushHistory = useCallback((config: UICustomizationConfig) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(JSON.parse(JSON.stringify(config)));
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const canUndo = useCallback(() => historyIndexRef.current > 0, []);
  const canRedo = useCallback(() => historyIndexRef.current < historyRef.current.length - 1, []);

  const undo = useCallback((): UICustomizationConfig | null => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      return JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
    }
    return null;
  }, []);

  const redo = useCallback((): UICustomizationConfig | null => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      return JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
    }
    return null;
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setHasChanges(false);
    snapshotRef.current = null;
    historyRef.current = [];
    historyIndexRef.current = -1;
  }, []);

  const getSnapshot = useCallback(() => {
    return snapshotRef.current;
  }, []);

  return {
    isEditMode,
    hasChanges,
    enterEditMode,
    exitEditMode,
    markChanged,
    getSnapshot,
    pushHistory,
    canUndo,
    canRedo,
    undo,
    redo,
  };
}
