-- Run only if you have NOT already installed the v5 discard-photo policy.
-- Safe to rerun.
drop policy if exists "aa owners delete media" on storage.objects;
create policy "aa owners delete media"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'aa-field-media'
  and public.aa_is_active_member()
  and ((storage.foldername(name))[1] = auth.uid()::text or public.aa_is_admin())
);
