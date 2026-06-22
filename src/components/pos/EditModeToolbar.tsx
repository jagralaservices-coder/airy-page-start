import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, X, RotateCcw, Move, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditModeToolbarProps {
  isEditMode: boolean;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  onToggleEditMode: () => void;
  hasChanges: boolean;
}

export const EditModeToolbar: React.FC<EditModeToolbarProps> = ({
  isEditMode,
  onSave,
  onCancel,
  onReset,
  onToggleEditMode,
  hasChanges,
}) => {
  if (!isEditMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground shadow-lg">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 animate-pulse">
            <Move className="w-4 h-4" />
            <span className="text-sm font-semibold">EDIT MODE</span>
          </div>
          <span className="text-xs opacity-80">
            Drag buttons to reorder • Click eye icon to show/hide • Change layout live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-primary-foreground hover:bg-primary-foreground/20 gap-1.5 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-primary-foreground hover:bg-primary-foreground/20 gap-1.5 h-8"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!hasChanges}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-1.5 h-8"
          >
            <Save className="w-3.5 h-3.5" />
            Save Layout
          </Button>
        </div>
      </div>
    </div>
  );
};
