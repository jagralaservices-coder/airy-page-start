import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenses, setExpenses, Expense, generateId } from '@/lib/store';
import { useLocale } from '@/contexts/LocaleContext';
import { Plus, Search, Calendar, Wallet, TrendingDown, ArrowLeft, Pencil, Trash2, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useStoreDataSync } from '@/hooks/useStoreDataSync';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const expenseCategories = ['Groceries', 'Utilities', 'Rent', 'Salaries', 'Marketing', 'Maintenance', 'Equipment', 'Other'];

const categoryEmojis: Record<string, string> = {
  Groceries: '🛒', Utilities: '⚡', Rent: '🏠', Salaries: '👥',
  Marketing: '📢', Maintenance: '🔧', Equipment: '🖥️', Other: '📦'
};

export const ExpenseTracker: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatCurrency } = useLocale();
  const [expenses, setExpensesState] = useState<Expense[]>(getExpenses());
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [newExpense, setNewExpense] = useState({ category: 'Groceries', amount: '', description: '', paidBy: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const { syncExpenses } = useStoreDataSync();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await syncExpenses(expenses);
      setExpensesState(synced);
      toast.success('Expenses synced successfully');
    } catch (e) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.description) { toast.error(t('common.required')); return; }
    const expense: Expense = { id: generateId(), category: newExpense.category, amount: Number(newExpense.amount), description: newExpense.description, date: new Date(), paidBy: newExpense.paidBy || t('pos.cash') };
    const updatedExpenses = [...expenses, expense];
    setExpensesState(updatedExpenses); setExpenses(updatedExpenses);
    setNewExpense({ category: 'Groceries', amount: '', description: '', paidBy: '' }); setShowAddExpense(false);
    toast.success(t('msg.saved'));
  };

  const handleEditExpense = () => {
    if (!editingExpense || !newExpense.amount || !newExpense.description) { toast.error(t('common.required')); return; }
    const updatedExpenses = expenses.map(exp => exp.id === editingExpense.id ? { ...exp, category: newExpense.category, amount: Number(newExpense.amount), description: newExpense.description, paidBy: newExpense.paidBy || t('pos.cash') } : exp);
    setExpensesState(updatedExpenses); setExpenses(updatedExpenses);
    setNewExpense({ category: 'Groceries', amount: '', description: '', paidBy: '' }); setEditingExpense(null);
    toast.success(t('msg.saved'));
  };

  const handleDeleteExpense = () => {
    if (!deleteExpenseId) return;
    const updatedExpenses = expenses.filter(exp => exp.id !== deleteExpenseId);
    setExpensesState(updatedExpenses); setExpenses(updatedExpenses); 
    
    // Track deletion for cloud sync
    try {
      const storeDataStr = localStorage.getItem('pos_active_store_data');
      const storeId = localStorage.getItem('owner_selected_store_id') || (storeDataStr ? JSON.parse(storeDataStr).id : null);
      if (storeId) {
        const deletedKey = `pos_deleted_expenses_${storeId}`;
        const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || '[]');
        deletedIds.push(deleteExpenseId);
        localStorage.setItem(deletedKey, JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.error('Error tracking deleted expense:', e);
    }
    
    setDeleteExpenseId(null);
    toast.success(t('msg.deleted'));
  };

  const openEditModal = (expense: Expense) => {
    setNewExpense({ category: expense.category, amount: expense.amount.toString(), description: expense.description, paidBy: expense.paidBy });
    setEditingExpense(expense);
  };

  const filteredExpenses = expenses.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === 'all' || e.category === activeFilter;
    return matchSearch && matchFilter;
  });

  const todayTotal = expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).reduce((sum, e) => sum + e.amount, 0);
  const monthTotal = expenses.filter(e => { const d = new Date(e.date); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).reduce((sum, e) => sum + e.amount, 0);

  const renderDescription = (description: string) => {
    // Check for "Initial stock: {qty} {unit} of {name}"
    const initialStockMatch = description.match(/Initial stock:\s*([\d.]+)\s*(\w+)\s+of\s+(.*)/i);
    if (initialStockMatch) {
      return (
        <>
          <p className="font-semibold text-foreground text-sm truncate capitalize">{initialStockMatch[3]}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Qty: {initialStockMatch[1]} {initialStockMatch[2]}</p>
        </>
      );
    }

    // Check for "Purchased {qty} {unit} of {name}"
    const purchasedMatch = description.match(/Purchased\s*([\d.]+)\s*(\w+)\s+of\s+(.*)/i);
    if (purchasedMatch) {
      return (
        <>
          <p className="font-semibold text-foreground text-sm truncate capitalize">{purchasedMatch[3]}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Purchased Qty: {purchasedMatch[1]} {purchasedMatch[2]}</p>
        </>
      );
    }

    // Default
    return <p className="font-semibold text-foreground text-sm truncate">{description}</p>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{t('nav.expenses')}</h1>
              <p className="text-xs text-muted-foreground">{expenses.length} records</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="gap-1.5 rounded-xl">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </Button>
            <Button size="sm" onClick={() => setShowAddExpense(true)} className="gap-1.5 rounded-xl">
              <Plus className="w-4 h-4" /> {t('expenses.addExpense')}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-warning/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-warning" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('common.today')}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(todayTotal)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-destructive/20 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('common.thisMonth')}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(monthTotal)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('common.search') + '...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl bg-card border-border" />
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setActiveFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${activeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>
            All
          </button>
          {expenseCategories.map(cat => (
            <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${activeFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>
              {categoryEmojis[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Expenses List */}
        <div className="space-y-2">
          {filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
            <div key={expense.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                {categoryEmojis[expense.category] || '💸'}
              </div>
              <div className="flex-1 min-w-0">
                {renderDescription(expense.description)}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">{expense.category}</span>
                  <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{new Date(expense.date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-destructive text-sm">{formatCurrency(expense.amount)}</p>
                <p className="text-[10px] text-muted-foreground">{expense.paidBy}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => openEditModal(expense)} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteExpenseId(expense.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">💰</div>
            <p className="text-muted-foreground text-sm">{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddExpense || editingExpense) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card border border-border rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-md animate-slide-in-up">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {editingExpense ? t('common.edit') : t('expenses.addExpense')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('expenses.category')}</label>
                <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full p-3 bg-secondary rounded-xl border-0 text-sm">
                  {expenseCategories.map(cat => <option key={cat} value={cat}>{categoryEmojis[cat]} {cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('expenses.amount')}</label>
                <Input type="number" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" className="rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('common.description')}</label>
                <Input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder={t('common.description')} className="rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('common.paid')}</label>
                <Input value={newExpense.paidBy} onChange={(e) => setNewExpense({ ...newExpense, paidBy: e.target.value })} placeholder={t('pos.paymentMethod')} className="rounded-xl" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowAddExpense(false); setEditingExpense(null); setNewExpense({ category: 'Groceries', amount: '', description: '', paidBy: '' }); }}>
                  {t('common.cancel')}
                </Button>
                <Button className="flex-1 rounded-xl" onClick={editingExpense ? handleEditExpense : handleAddExpense}>
                  {editingExpense ? t('common.update') : t('common.add')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteExpenseId} onOpenChange={() => setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}?</AlertDialogTitle>
            <AlertDialogDescription>{t('msg.confirmDelete')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.no')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.yes')}, {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
