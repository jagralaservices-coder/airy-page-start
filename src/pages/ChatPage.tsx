import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { usePOSSafe } from '@/contexts/POSContext';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Users, MessageCircle, Image as ImageIcon, ArrowLeft, Mic, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';


interface Conversation {
  id: string;
  name: string | null;
  type: string;
  store_id: string | null;
  updated_at: string;
  unread_count?: number;
}

interface Message {
  id: string;
  content: string | null;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
  message_type: string;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean | null;
}

const ChatPage: React.FC = () => {
  const { user } = useSupabaseAuth();
  const posContext = usePOSSafe();
  const { t } = useLocale();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = user?.id || '';
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const getUserRole = useCallback(() => {
    const staffSession = localStorage.getItem('pos_staff_session');
    if (staffSession) return 'staff';
    return 'owner';
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase.from('chat_conversations').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setConversations(data || []);
    } catch (err) { console.error('Failed to load conversations:', err); } finally { setLoading(false); }
  }, [currentUserId]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(200);
      if (error) throw error;
      setMessages(data || []);
      await supabase.from('chat_messages').update({ is_read: true }).eq('conversation_id', conversationId).neq('sender_id', currentUserId);
    } catch (err) { console.error('Failed to load messages:', err); }
  }, [currentUserId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { if (selectedConversation) loadMessages(selectedConversation); }, [selectedConversation, loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase.channel(`chat-${selectedConversation}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedConversation}` }, (payload) => {
      const newMsg = payload.new as Message;
      setMessages(prev => [...prev, newMsg]);
      if (newMsg.sender_id !== currentUserId) supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation, currentUserId]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;
    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({ conversation_id: selectedConversation, sender_id: currentUserId, sender_name: currentUserName, sender_role: getUserRole(), content: newMessage.trim(), message_type: 'text' });
      if (error) throw error;
      setNewMessage('');
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConversation);
    } catch (err) { toast.error('Failed to send message'); } finally { setSending(false); }
  };

  // Send media
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !currentUserId) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('File size must be less than 50MB'); return; }
    try {
      const fileName = `${currentUserId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
      await supabase.from('chat_messages').insert({ conversation_id: selectedConversation, sender_id: currentUserId, sender_name: currentUserName, sender_role: getUserRole(), content: file.name, message_type: 'media', media_url: urlData.publicUrl, media_type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file' });
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConversation);
    } catch (err) { toast.error('Failed to upload media'); }
  };

  // Initialize store team chat
  const initializeStoreChat = async () => {
    if (!currentUserId || !posContext?.activeStore) return;
    const storeName = posContext.activeStore.name || 'Store';
    const chatName = `${storeName} Team`;
    const { data: existing } = await supabase.from('chat_conversations').select('id').eq('name', chatName).eq('type', 'group').maybeSingle();
    if (existing) { setSelectedConversation(existing.id); return; }
    const storeId = posContext.activeStore.id;
    const { data: conv, error } = await supabase.from('chat_conversations').insert({ name: chatName, type: 'group', store_id: storeId, created_by: currentUserId }).select().single();
    if (error) { toast.error('Failed to create chat'); return; }
    await supabase.from('chat_participants').insert({ conversation_id: conv.id, user_id: currentUserId, user_name: currentUserName, user_role: getUserRole() });
    loadConversations(); setSelectedConversation(conv.id); toast.success('Team chat created!');
  };

  const selectedConvData = conversations.find(c => c.id === selectedConversation);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-primary/20 text-primary';
      case 'admin': return 'bg-destructive/20 text-destructive';
      case 'staff': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
        {/* Conversations List */}
        <div className={cn('border-r border-border flex flex-col bg-card', selectedConversation ? 'hidden md:flex w-80' : 'w-full md:w-80')}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                {t('common.teamChat')}
              </h2>
              <Button size="sm" variant="outline" onClick={initializeStoreChat} className="rounded-xl gap-1.5">
                <Users className="w-3.5 h-3.5" /> New
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <Button size="sm" className="mt-3 rounded-xl" onClick={initializeStoreChat}>Create Team Chat</Button>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={cn('w-full text-left p-4 border-b border-border/50 hover:bg-accent/50 transition-colors', selectedConversation === conv.id && 'bg-primary/5 border-l-2 border-l-primary')}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {(conv.name || 'C')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-sm">{conv.name || 'Chat'}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(conv.updated_at), 'dd MMM, hh:mm a')}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px] rounded-full">{conv.type}</Badge>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={cn('flex-1 flex flex-col bg-background', !selectedConversation && 'hidden md:flex')}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedConversation(null)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {(selectedConvData?.name || 'C')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground text-sm">{selectedConvData?.name || 'Chat'}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                    {selectedConvData?.type === 'group' ? 'Group Chat • Online' : 'Direct Message'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map(msg => {
                    const isOwn = msg.sender_id === currentUserId;
                    return (
                      <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
                          {!isOwn && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[11px] font-semibold text-foreground">{msg.sender_name}</span>
                              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold', getRoleBadgeColor(msg.sender_role))}>
                                {msg.sender_role}
                              </span>
                            </div>
                          )}
                          <div className={cn(
                            'rounded-2xl px-4 py-2.5 text-sm',
                            isOwn ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border text-foreground rounded-bl-md'
                          )}>
                            {msg.message_type === 'media' && msg.media_url ? (
                              msg.media_type === 'image' ? (
                                <img src={msg.media_url} alt={msg.content || ''} className="max-w-full rounded-lg max-h-60 object-cover" />
                              ) : (
                                <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="underline">📎 {msg.content || 'File'}</a>
                              )
                            ) : (
                              <p>{msg.content}</p>
                            )}
                          </div>
                          <p className={cn('text-[10px] text-muted-foreground mt-1', isOwn && 'text-right')}>
                            {format(new Date(msg.created_at), 'hh:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border bg-card">
                <div className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-1">
                  <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={handleMediaUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-muted rounded-xl">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  />
                  <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon" className="rounded-xl h-9 w-9 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-muted-foreground/10 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default ChatPage;
