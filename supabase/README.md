# Supabase setup

1. Create a free Supabase project.
2. Open **SQL Editor**, paste `migrations/001_initial.sql`, and run it.
3. In **Authentication → Providers → Email**, keep email/password enabled and disable public sign-ups.
4. Create these nine users in **Authentication → Users** using:

   - `risvin@endiless-kemmyoonity.local`
   - `hashil@endiless-kemmyoonity.local`
   - `shanan@endiless-kemmyoonity.local`
   - `rashad@endiless-kemmyoonity.local`
   - `shahid@endiless-kemmyoonity.local`
   - `shahinsha@endiless-kemmyoonity.local`
   - `anil@endiless-kemmyoonity.local`
   - `anas@endiless-kemmyoonity.local`
   - `sreerag@endiless-kemmyoonity.local`

   Give each user their unique private code as the password and mark the email confirmed.

5. Copy each Auth user UUID and insert its profile:

```sql
insert into public.profiles (id, display_name, is_organizer) values
  ('RISVIN_AUTH_UUID', 'Risvin', false),
  ('HASHIL_AUTH_UUID', 'Hashil', true),
  ('SHANAN_AUTH_UUID', 'Shanan', false),
  ('RASHAD_AUTH_UUID', 'Rashad', false),
  ('SHAHID_AUTH_UUID', 'Shahid', false),
  ('SHAHINSHA_AUTH_UUID', 'Shahinsha', false),
  ('ANIL_AUTH_UUID', 'Anil', false),
  ('ANAS_AUTH_UUID', 'Anas', false),
  ('SREERAG_AUTH_UUID', 'Sreerag', false);
```

6. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key from the Supabase Connect dialog.

Never place a Supabase secret key in a `VITE_` environment variable.
