import React, { useState, forwardRef } from 'react';
import { MessageSquare, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderItemNotesProps {
  itemId: string;
  itemName: string;
  notes: string;
  onSave: (itemId: string, notes: string) => void;
}

export const OrderItemNotes = forwardRef<HTMLDivElement, OrderItemNotesProps>(({
  itemId,
  itemName,
  notes,
  onSave
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);

  const quickNotes = [
    'No onion',
    'Extra spicy',
    'Less oil',
    'No garlic',
    'Extra cheese',
    'Less salt'
  ];

  const handleSave = () => {
    onSave(itemId, localNotes);
    setIsEditing(false);
  };

  const addQuickNote = (note: string) => {
    const newNotes = localNotes ? `${localNotes}, ${note}` : note;
    setLocalNotes(newNotes);
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          'flex items-center gap-1 text-xs transition-colors',
          notes ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <MessageSquare className="w-3 h-3" />
        {notes ? notes.slice(0, 20) + (notes.length > 20 ? '...' : '') : 'Add note'}
      </button>
    );
  }

  return (
    <div ref={ref} className="mt-2 p-3 bg-muted rounded-lg space-y-2 animate-scale-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Notes for {itemName}</span>
        <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-secondary rounded">
          <X className="w-3 h-3" />
        </button>
      </div>
      
      {/* Quick Notes */}
      <div className="flex flex-wrap gap-1">
        {quickNotes.map((note) => (
          <button
            key={note}
            onClick={() => addQuickNote(note)}
            className="px-2 py-1 text-xs bg-secondary rounded-full hover:bg-primary/20 transition-colors"
          >
            {note}
          </button>
        ))}
      </div>

      {/* Notes Input */}
      <textarea
        value={localNotes}
        onChange={(e) => setLocalNotes(e.target.value)}
        placeholder="Special instructions..."
        rows={2}
        className="w-full pos-input text-xs resize-none"
      />

      <button
        onClick={handleSave}
        className="w-full pos-btn-primary py-1.5 text-xs flex items-center justify-center gap-1"
      >
        <Check className="w-3 h-3" />
        Save Notes
      </button>
    </div>
  );
});

OrderItemNotes.displayName = 'OrderItemNotes';
