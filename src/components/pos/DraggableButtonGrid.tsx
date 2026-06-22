import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { ButtonConfig } from '@/hooks/useUICustomization';

interface DraggableButtonGridProps {
  buttons: ButtonConfig[];
  isEditMode: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleVisibility: (buttonId: string) => void;
  renderButton: (button: ButtonConfig, index: number) => React.ReactNode;
  groupLabel?: string;
}

export const DraggableButtonGrid: React.FC<DraggableButtonGridProps> = ({
  buttons,
  isEditMode,
  onReorder,
  onToggleVisibility,
  renderButton,
  groupLabel,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLElement | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    dragNode.current = e.target as HTMLElement;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // Make the drag image semi-transparent
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.style.opacity = '0.4';
      }
    }, 0);
  }, [isEditMode]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) {
      dragNode.current.style.opacity = '1';
    }
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      onReorder(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  }, [dragIndex, dragOverIndex, onReorder]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  return (
    <div className="relative w-full">
      {isEditMode && groupLabel && (
        <div className="absolute -top-5 left-0 text-[10px] font-bold uppercase tracking-wider text-primary opacity-70">
          {groupLabel}
        </div>
      )}
      <div className="grid grid-cols-6 gap-2 w-full">
        {buttons.map((btn, index) => {
          const isHidden = !btn.visible;
          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index;

          if (!isEditMode && isHidden) return null;

          return (
            <div
              key={btn.id}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
              className={cn(
                'relative group transition-all duration-200 w-full',
                isEditMode && 'cursor-grab active:cursor-grabbing',
                isDragging && 'opacity-40 scale-95',
                isDragOver && 'ring-2 ring-primary ring-offset-1 rounded-lg',
                isEditMode && isHidden && 'opacity-40',
                isEditMode && 'hover:ring-1 hover:ring-primary/50 rounded-lg',
                // Dynamic col-span to fit buttons in 2 lines perfectly
                buttons.length === 5
                  ? index < 3 ? 'col-span-2' : 'col-span-3'
                  : buttons.length === 4
                  ? 'col-span-3'
                  : buttons.length === 3
                  ? 'col-span-2'
                  : buttons.length === 2
                  ? 'col-span-3'
                  : buttons.length === 1
                  ? 'col-span-6'
                  : 'col-span-2'
              )}
            >
              {/* Edit mode overlay controls */}
              {isEditMode && (
                <>
                  {/* Drag handle indicator */}
                  <div className="absolute -top-1 -left-1 z-20 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md">
                    <GripVertical className="w-2.5 h-2.5" />
                  </div>
                  {/* Visibility toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onToggleVisibility(btn.id);
                    }}
                    className={cn(
                      'absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full flex items-center justify-center shadow-md transition-colors',
                      btn.visible
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    )}
                  >
                    {btn.visible ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                  </button>
                  {/* Position badge */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 bg-muted text-muted-foreground text-[8px] font-bold px-1.5 rounded-full shadow">
                    {index + 1}
                  </div>
                </>
              )}
              {/* The actual button */}
              <div className={cn(isEditMode && 'pointer-events-none')}>
                {renderButton(btn, index)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
