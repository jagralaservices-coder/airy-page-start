-- Create chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'store')),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'store_manager', 'staff')),
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file')),
  media_url TEXT,
  media_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat participants table for group chats
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view conversations they participate in"
ON public.chat_conversations FOR SELECT
USING (
  id IN (SELECT conversation_id FROM public.chat_participants WHERE user_id = auth.uid())
  OR created_by = auth.uid()
  OR is_admin(auth.uid())
  OR (customer_id = get_user_customer_id(auth.uid()))
);

CREATE POLICY "Users can create conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and owners can update conversations"
ON public.chat_conversations FOR UPDATE
USING (
  created_by = auth.uid()
  OR is_admin(auth.uid())
  OR (customer_id = get_user_customer_id(auth.uid()) AND is_owner(auth.uid()))
);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE id IN (SELECT conversation_id FROM public.chat_participants WHERE user_id = auth.uid())
    OR created_by = auth.uid()
    OR customer_id = get_user_customer_id(auth.uid())
  )
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND sender_id = auth.uid()
);

CREATE POLICY "Users can update own messages"
ON public.chat_messages FOR UPDATE
USING (sender_id = auth.uid());

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their conversations"
ON public.chat_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE id IN (SELECT conversation_id FROM public.chat_participants WHERE user_id = auth.uid())
    OR created_by = auth.uid()
    OR customer_id = get_user_customer_id(auth.uid())
  )
  OR is_admin(auth.uid())
);

CREATE POLICY "Conversation creators and owners can add participants"
ON public.chat_participants FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE created_by = auth.uid()
    OR customer_id = get_user_customer_id(auth.uid())
  )
  OR is_admin(auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Users can leave conversations"
ON public.chat_participants FOR DELETE
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create indexes for performance
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_conversation ON public.chat_participants(conversation_id);

-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 
  'chat-media', 
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Storage policies for chat media
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);