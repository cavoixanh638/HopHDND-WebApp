-- STAGING ONLY: prevent any anonymous / non-allowlisted Google account
-- from reading business rows before private 50+ row parity snapshot import.
-- Applies to project uguhyunuzsdrkykqgdmq. Never run in Firebase.
-- hdnd_private.is_admin() already checks Google identity, email verified,
-- auth.jwt() is_anonymous=false and private admin_emails allowlist.
ALTER POLICY hdnd_items_read ON public.hdnd_items TO authenticated
  USING ((SELECT hdnd_private.is_admin()));
ALTER POLICY hdnd_acl_read ON public.hdnd_acl TO authenticated
  USING ((SELECT hdnd_private.is_admin()));
ALTER POLICY hdnd_audit_read ON public.hdnd_audit TO authenticated
  USING ((SELECT hdnd_private.is_admin()));
ALTER POLICY hdnd_control_read ON public.hdnd_control TO authenticated
  USING ((SELECT hdnd_private.is_admin()));
ALTER POLICY hdnd_profile_read ON public.hdnd_profile TO authenticated
  USING ((SELECT hdnd_private.is_admin()));
ALTER POLICY hdnd_locks_self ON public.hdnd_cell_locks TO authenticated
  USING (owner_uid=(SELECT auth.uid()) AND (SELECT hdnd_private.is_admin()));

-- Same verified Google admin already declared as Firebase admin in the repo.
-- No Supabase Auth user is created by this allowlist entry; Google OAuth must
-- still succeed in the browser and auth.identities.provider='google' be present.
INSERT INTO hdnd_private.admin_emails (email)
VALUES ('cavoixanh638@gmail.com')
ON CONFLICT DO NOTHING;
