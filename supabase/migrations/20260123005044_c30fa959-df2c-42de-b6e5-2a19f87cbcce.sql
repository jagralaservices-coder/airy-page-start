-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.chat_conversations;

-- Create a security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
$$;

-- Create a security definer function to get user's conversation IDs
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM public.chat_participants WHERE user_id = p_user_id;
$$;

-- Recreate chat_conversations policy using the function
CREATE POLICY "Users can view conversations they participate in" 
ON public.chat_conversations 
FOR SELECT 
USING (
  id IN (SELECT get_user_conversation_ids(auth.uid()))
  OR created_by = auth.uid()
  OR is_admin(auth.uid())
  OR customer_id = get_user_customer_id(auth.uid())
);

-- Recreate chat_participants policy without recursion
CREATE POLICY "Users can view participants in their conversations" 
ON public.chat_participants 
FOR SELECT 
USING (
  conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
  OR is_admin(auth.uid())
);

-- Recreate chat_messages policy without recursion
CREATE POLICY "Users can view messages in their conversations" 
ON public.chat_messages 
FOR SELECT 
USING (
  conversation_id IN (SELECT get_user_conversation_ids(auth.uid()))
  OR is_admin(auth.uid())
);