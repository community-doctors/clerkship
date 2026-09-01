-- Alang-Alang Fieldwork Hub v5
-- Allow owner/admin to remove an optional photo when discarding a synced draft.

drop policy if exists "aa owners delete media" on storage.objects;

create policy "aa owners delete media"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'aa-field-media'
  and public.aa_is_active_member()
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.aa_is_admin()
  )
);

select 'Draft discard media policy installed' as result;
