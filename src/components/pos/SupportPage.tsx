import React, { useState } from 'react';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  FileText,
  ChevronRight,
  Send,
  Bot,
  Keyboard,
  Video,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TutorialsSection } from './TutorialsSection';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const keyboardShortcuts = [
  { key: 'F1', description: 'Complete Cash sale (Sets payment to Cash & prints)' },
  { key: 'F2', description: 'Complete sale with current payment (or Cash by default) and prints' },
  { key: 'F3', description: 'Generate & Print KOT only (does not complete sale)' },
  { key: 'F4', description: 'Get focus to Add New Item on Billing Screen' },
  { key: 'F5', description: 'New Order' },
  { key: 'F6', description: 'Complete KOT sale (KOT kitchen display print)' },
  { key: 'F7', description: 'Search using Table no.' },
  { key: 'F8', description: 'Save & eBill Order' },
  { key: 'F9', description: 'Select Delivery mode on Billing screen' },
  { key: 'F11', description: 'Select Dine In mode on Billing screen' },
  { key: 'F12', description: 'Select Pick Up mode on Billing screen' },
  { key: 'Tab / Shift + Tab', description: 'Cycle forward through billing sections: Products, Cart, Payments, Actions' },
  { key: 'Arrow Keys', description: 'Navigate between items/buttons within the currently active section' },
  { key: 'Enter', description: 'Select/add highlighted item in active section (or search exact SKU and add if in search input)' },
  { key: '+ or =', description: 'Increase quantity of the highlighted cart item (or last item if cart section not active)' },
  { key: '-', description: 'Decrease quantity of the highlighted cart item (or last item if cart section not active)' },
  { key: 'Delete / Backspace', description: 'Remove the highlighted cart item (or last item if cart section not active)' },
  { key: 'Escape', description: 'Clear product search or close the More Payment Options sheet' },
  { key: 'Ctrl+A', description: 'Accept online order' },
  { key: 'Ctrl+D', description: 'Calculate Distance' },
  { key: 'Ctrl+E', description: 'Focus on Bill No search box' },
  { key: 'Ctrl+H', description: 'Help Text' },
  { key: 'Ctrl+I', description: 'Item Report' },
  { key: 'Ctrl+K', description: 'Kot Listing' },
  { key: 'Ctrl+L', description: 'Logout' },
  { key: 'Ctrl+M', description: 'Manual Sync' },
  { key: 'Ctrl+N', description: 'Notifications' },
  { key: 'Ctrl+O', description: 'Order Listing' },
  { key: 'Ctrl+P', description: 'Online Order Listing' },
  { key: 'Ctrl+R', description: 'Order Report' },
  { key: 'Ctrl+S', description: 'Sales Report' },
  { key: 'Ctrl+T', description: 'Table Management' },
  { key: 'Ctrl+Z', description: 'On Hold' },
  { key: 'Ctrl+Shift+K', description: 'Kot Live View' },
  { key: 'Ctrl+Shift+O', description: 'Order Live View' },
  { key: 'Ctrl+Backspace', description: 'Go to Previous Main Page (Back button)' },
  { key: 'End', description: 'Generate bill from kot items' },
];

const orderColors = [
  { color: 'bg-green-500', label: 'Green Color', description: 'Printed Order' },
  { color: 'bg-gray-400', label: 'Grey Color', description: 'Saved Order without Print' },
  { color: 'bg-emerald-700', label: 'Dark Green Color', description: 'Paid via Wallet' },
];

const faqs = [
  {
    question: 'How do I add a new menu item?',
    answer: 'Go to Menu Management, click "Add Item", fill in the details and save.'
  },
  {
    question: 'How do I hold a bill?',
    answer: 'In the cart section, click the "Hold" button to save the current order for later.'
  },
  {
    question: 'How do I connect my printer?',
    answer: 'Go to Settings > Printer Settings to configure your thermal printer.'
  },
  {
    question: 'Can I use this offline?',
    answer: 'Yes! The POS works offline and syncs data when you\'re back online.'
  },
  {
    question: 'How do I generate reports?',
    answer: 'Visit the Dashboard for daily stats or Reports section for detailed analytics.'
  }
];

export const SupportPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your POS assistant. How can I help you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'shortcuts' | 'faq'>('videos');

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thanks for your message! Our team will get back to you shortly. For immediate help, check our FAQ section.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground">Get help with your POS system</p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setShowChat(true)}
          className="pos-card-interactive p-5 text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-primary/20 text-primary">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Live Chat</h3>
              <p className="text-sm text-muted-foreground">Chat with our bot</p>
            </div>
          </div>
        </button>
        <a
          href="tel:+919876543210"
          className="pos-card-interactive p-5 text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-success/20 text-success">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Call Us</h3>
              <p className="text-sm text-muted-foreground">+91 98765 43210</p>
            </div>
          </div>
        </a>
        <a
          href="mailto:support@MAXORA.com"
          className="pos-card-interactive p-5 text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-cat-drinks/20 text-cat-drinks">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Email</h3>
              <p className="text-sm text-muted-foreground">support@MAXORA.com</p>
            </div>
          </div>
        </a>
      </div>

      {/* Chat Window */}
      {showChat && (
        <div className="pos-card overflow-hidden">
          <div className="bg-primary p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary-foreground" />
              <div>
                <h3 className="font-semibold text-primary-foreground">POS Assistant</h3>
                <p className="text-sm text-primary-foreground/80">Usually replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              ✕
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[80%] p-3 rounded-2xl',
                  msg.sender === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-secondary text-foreground rounded-bl-sm'
                )}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 pos-input"
              placeholder="Type your message..."
            />
            <button
              onClick={sendMessage}
              className="pos-btn-primary px-4"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-border/60">
        {[
          { id: 'videos', label: 'Video Tutorials', icon: Video },
          { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
          { id: 'faq', label: 'FAQs', icon: HelpCircle }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all relative ${
                isActive 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'videos' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                POS Software Training Videos
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Step-by-step video tutorials and guided walkthroughs for system operation.</p>
            </div>
            <TutorialsSection />
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="space-y-6">
            {/* Keyboard Shortcuts Section */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-primary" />
                Keyboard Shortcuts
              </h2>
              <div className="pos-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px] font-semibold">Shortcut Key</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keyboardShortcuts.map((shortcut, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <kbd className="px-2 py-1 text-sm font-mono bg-muted rounded border border-border">
                            {shortcut.key}
                          </kbd>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{shortcut.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Order Color Indicators */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Recent Orders - Color Indicators
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {orderColors.map((item, idx) => (
                  <div key={idx} className="pos-card p-4 flex items-center gap-3">
                    <div className={cn('w-4 h-4 rounded-full', item.color)} />
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <details key={idx} className="pos-card group">
                  <summary className="p-4 cursor-pointer flex items-center justify-between font-medium text-foreground">
                    {faq.question}
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 text-muted-foreground">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
