-- RLS + Supabase Realtime for internal DMs.
-- Writes go through Prisma (postgres role, bypasses RLS); these SELECT policies
-- exist so the browser Realtime subscription only receives a user's own rows.
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_member_select" ON public.conversations;
CREATE POLICY "conversations_member_select" ON public.conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "conversation_participants_own_select" ON public.conversation_participants;
CREATE POLICY "conversation_participants_own_select" ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "direct_messages_member_select" ON public.direct_messages;
CREATE POLICY "direct_messages_member_select" ON public.direct_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = direct_messages.conversation_id AND cp.user_id = auth.uid()) OR public.is_admin());

ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;
