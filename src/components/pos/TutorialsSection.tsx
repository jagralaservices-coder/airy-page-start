import React, { useState } from 'react';
import { 
  Play, 
  Search, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Tag, 
  ChevronRight, 
  HelpCircle, 
  FileVideo, 
  ListChecks, 
  AlertCircle,
  X,
  Laptop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'billing' | 'inventory' | 'menu' | 'admin';
  videoUrl: string;
  steps: string[];
}

const tutorials: TutorialVideo[] = [
  {
    id: 'billing_payments',
    title: 'Billing with All Payment Types',
    description: 'Learn how to add items, assign tables, and complete sales using Cash, Card, UPI, Split Payments, Wallets, and Credit Ledger.',
    duration: '2:15',
    category: 'billing',
    videoUrl: '/videos/billing_payments.mp4',
    steps: [
      'Tap items on the left grid to add them to the active cart.',
      'Change quantities using the "+" or "-" buttons in the cart panel.',
      'Choose Order Type: Dine In, Takeaway, or Delivery.',
      'For Dine In, select a table from the Table Management layout.',
      'Click the "Pay" button to open the Payment options drawer.',
      'Select payment method: Cash, UPI (shows dynamic QR code), Card, Wallet, Split, or Credit Ledger (for customer tabs).',
      'Click "Complete Order" to finish the sale and automatically print the KOT/Bill.'
    ]
  },
  {
    id: 'menu_upload',
    title: 'Bulk Menu Uploading',
    description: 'Import your entire menu in one go using CSV, Excel, or PDF files. Shows automatic category and price detection.',
    duration: '1:45',
    category: 'menu',
    videoUrl: '/videos/menu_upload.mp4',
    steps: [
      'Navigate to the sidebar menu and select "Bulk Upload" under Menu Management.',
      'Drag and drop your menu PDF, Excel sheet, or CSV file into the upload zone.',
      'Our intelligent parser extracts item names, categories, and prices automatically.',
      'Review the parsed list in the interactive table.',
      'Edit item names, categories, or prices directly in the table if needed.',
      'Click "Import Items" to write them directly to your live menu database.'
    ]
  },
  {
    id: 'inventory_upload',
    title: 'Bulk Inventory & Raw Materials',
    description: 'Set up your raw materials, ingredients, cost per unit, and min stock thresholds using bulk CSV upload.',
    duration: '2:00',
    category: 'inventory',
    videoUrl: '/videos/inventory_upload.mp4',
    steps: [
      'Go to Inventory Management from the dashboard.',
      'Select the "Bulk Upload" tile under the Purchase section.',
      'Click "Download Sample CSV" to view the correct template format.',
      'Prepare your CSV with headers: name, quantity, unit, cost_per_unit, cost_unit, min_stock.',
      'Upload your completed CSV file in the drag-and-drop area.',
      'Review parsed raw materials, unit conversions (e.g. KG to G), and cost rates.',
      'Click "Import" to save them and auto-update stock values.'
    ]
  },
  {
    id: 'reports_analytics',
    title: 'Sales Reports & Advanced Analytics',
    description: 'How to read your daily dashboard sales, track category-wise sales, item performance, tax reports, and download Excel exports.',
    duration: '2:30',
    category: 'admin',
    videoUrl: '/videos/reports_analytics.mp4',
    steps: [
      'Click on "Reports" in the navigation sidebar.',
      'The main page shows live stats: Total Sales, Order Count, and Avg Order Value.',
      'Explore specific summaries: Category-wise sales, Top Selling Items, or Employee summaries.',
      'For detailed analysis, click on "Advanced Reports" to view daily/weekly trends.',
      'Filter reports by custom date ranges or preset periods (Today, This Week, This Month).',
      'Use the Excel or PDF export button to download offline summaries for accounting.'
    ]
  },
  {
    id: 'menu_updates',
    title: 'Item Availability & Quick Menu Updates',
    description: 'Instantly toggle items on/off when out-of-stock, edit prices, update descriptions, and manage variations.',
    duration: '1:30',
    category: 'menu',
    videoUrl: '/videos/menu_updates.mp4',
    steps: [
      'Go to "Item On/Off" from the dashboard or quick settings.',
      'Use the search bar or category filters to find the menu item.',
      'Toggle the switch to make an item Out of Stock instantly (removes it from client order screens).',
      'To edit pricing or descriptions, go to "Menu Management" > "Edit Item".',
      'For items with variations (e.g. Half/Full, 500ml/1L), click "Manage Variations" to set custom prices.',
      'All changes sync in real-time across billing and customer-facing menus.'
    ]
  },
  {
    id: 'credit_ledger',
    title: 'Credit Ledger & Customer Tabs',
    description: 'Track customer balances, log due payments, add new credit accounts, and reconcile payments.',
    duration: '1:50',
    category: 'billing',
    videoUrl: '/videos/credit_ledger.mp4',
    steps: [
      'Open the "Credit Ledger" page from the main navigation sidebar.',
      'Search for a customer by name or phone number, or click "Add Customer" to open a new tab.',
      'Click on any customer to view their detailed transaction ledger and total outstanding balance.',
      'To log a sale as credit, choose "Credit Ledger" as the payment method during checkout.',
      'To collect a credit payment, click "Receive Payment" inside the customer profile, enter the amount, select payment method, and save.'
    ]
  },
  {
    id: 'sales_reset',
    title: 'Sales Reset & Day End Process',
    description: 'Reconcile cash drawers, review daily totals, extend reset times, and set automatic day-end reset timers.',
    duration: '1:20',
    category: 'admin',
    videoUrl: '/videos/sales_reset.mp4',
    steps: [
      'Go to "Operations" from the side menu and select "Sales Reset".',
      'The screen shows the time remaining until the automatic daily sales reset.',
      'Click "Extend Timer" if you are operating late to avoid mid-session reset.',
      'To perform a manual day-end, click "Reset Sales Now" (requires Manager PIN).',
      'Verify cash-in-hand and total payment breakdowns (UPI, Card, Cash) before finalizing.',
      'Reconciliation reports are automatically uploaded to the cloud and emailed to the owner.'
    ]
  }
];

export const TutorialsSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'billing' | 'inventory' | 'menu' | 'admin'>('all');
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);
  
  // Interactive guided tour state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [videoPlayError, setVideoPlayError] = useState(false);

  const filteredTutorials = tutorials.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenVideo = (video: TutorialVideo) => {
    setSelectedVideo(video);
    setCurrentStepIndex(0);
    setVideoPlayError(false);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  const nextStep = () => {
    if (selectedVideo && currentStepIndex < selectedVideo.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search training videos & guides..." 
            className="pl-10 h-11 bg-card border-border/80 rounded-2xl" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Videos' },
            { id: 'billing', label: 'Billing & Credit' },
            { id: 'menu', label: 'Menu & Updates' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'admin', label: 'Reports & Settings' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-4 py-2 text-xs font-semibold rounded-2xl border transition-all active:scale-[0.98] ${
                selectedCategory === cat.id 
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10'
                  : 'bg-card text-muted-foreground border-border/60 hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tutorial Cards */}
      {filteredTutorials.length === 0 ? (
        <div className="pos-card p-12 text-center space-y-4">
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-lg text-foreground">No tutorials found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search or select a different category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map((item) => (
            <div 
              key={item.id}
              className="pos-card-interactive flex flex-col group overflow-hidden"
              onClick={() => handleOpenVideo(item)}
            >
              {/* Card Thumbnail / Play Button */}
              <div className="relative aspect-video bg-gradient-to-tr from-primary/10 via-primary/5 to-secondary flex items-center justify-center border-b border-border/40">
                {/* Visual Category Icon */}
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-background/85 backdrop-blur-md rounded-xl text-[10px] font-bold tracking-wider uppercase text-muted-foreground border border-border/40 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  {item.category === 'billing' ? 'Billing' : 
                   item.category === 'inventory' ? 'Inventory' : 
                   item.category === 'menu' ? 'Menu' : 'Admin'}
                </div>
                
                {/* Duration Tag */}
                <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/75 rounded-md text-[10px] font-mono font-bold text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-white/80" />
                  {item.duration}
                </div>

                {/* Big Glassmorphic Play button */}
                <div className="w-14 h-14 rounded-full bg-background/30 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-xl group-hover:scale-110 transition-all text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                    {item.title}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                
                {/* Steps summary */}
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <ListChecks className="w-4 h-4 text-primary" />
                  {item.steps.length} Steps Guided Tour
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal & Interactive Slide Deck */}
      <Dialog open={selectedVideo !== null} onOpenChange={handleCloseVideo}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 border-0 overflow-hidden rounded-2xl shadow-2xl bg-background">
          {selectedVideo && (
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">{selectedVideo.title}</DialogTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Training Video & Interactive Guided Tour</p>
                  </div>
                </div>
                <button onClick={handleCloseVideo} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Main Content Area */}
              <div className="overflow-y-auto flex-1">
                {/* Media Section */}
                <div className="bg-black aspect-video relative flex flex-col items-center justify-center">
                  {!videoPlayError ? (
                    <video
                      src={selectedVideo.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                      onError={() => {
                        console.log(`Video file ${selectedVideo.videoUrl} not loaded, falling back to interactive slide tour.`);
                        setVideoPlayError(true);
                      }}
                    />
                  ) : (
                    // Interactive Slide Fallback
                    <div className="w-full h-full p-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col justify-between select-none">
                      {/* Top bar */}
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1.5 text-primary-foreground/90 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                          Interactive Training Slide {currentStepIndex + 1} of {selectedVideo.steps.length}
                        </span>
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">GUIDED MODE</span>
                      </div>

                      {/* Content illustration / Visual mockup */}
                      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary mb-4 shadow-lg shadow-primary/10 animate-bounce">
                          <Laptop className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-lg text-slate-100 tracking-tight">Step {currentStepIndex + 1}</h4>
                        <p className="text-sm text-slate-200 mt-2 max-w-md leading-relaxed font-medium">
                          {selectedVideo.steps[currentStepIndex]}
                        </p>
                      </div>

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                        <Button 
                          variant="ghost" 
                          onClick={prevStep}
                          disabled={currentStepIndex === 0}
                          className="h-9 px-3 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1.5" />
                          Previous
                        </Button>
                        
                        {/* Dot indicators */}
                        <div className="flex gap-1.5">
                          {selectedVideo.steps.map((_, idx) => (
                            <div 
                              key={idx}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                idx === currentStepIndex ? 'bg-primary w-4' : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>

                        {currentStepIndex === selectedVideo.steps.length - 1 ? (
                          <Button 
                            onClick={handleCloseVideo}
                            className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/95"
                          >
                            Finish Tour
                          </Button>
                        ) : (
                          <Button 
                            onClick={nextStep}
                            className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/95"
                          >
                            Next Step
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Info and Instructions */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">About this training guide</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {selectedVideo.description}
                    </p>
                  </div>

                  {/* Step list summary */}
                  <div className="pos-card p-4 space-y-3 bg-secondary/30">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-primary" />
                      All steps in this tutorial:
                    </h4>
                    <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-2 leading-relaxed">
                      {selectedVideo.steps.map((stepText, idx) => (
                        <li key={idx} className={idx === currentStepIndex && videoPlayError ? 'text-primary font-bold' : ''}>
                          {stepText}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Admin setup instruction */}
                  <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold uppercase tracking-wider">How to upload your own video file:</p>
                      <p className="leading-relaxed">
                        To replace this guide with your store's custom recorded video:
                      </p>
                      <ol className="list-decimal pl-4 mt-1 space-y-0.5 font-medium">
                        <li>Record your POS screen performing this action.</li>
                        <li>Save the file as <code className="bg-amber-500/15 px-1 rounded font-mono font-bold text-amber-700 dark:text-amber-300">{selectedVideo.id}.mp4</code>.</li>
                        <li>Place it inside the <code className="bg-amber-500/15 px-1 rounded font-mono font-bold text-amber-700 dark:text-amber-300">public/videos/</code> directory of your software project.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
