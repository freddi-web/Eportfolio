# Vercel + Supabase form setup

The contact and registration forms send data to the Vercel function at `/api/submit`. That function validates submissions and inserts them into Supabase. The Supabase secret key is used only by the server; it must never be added to browser code or committed to this repository.

## 1. Create the Supabase tables

In your Supabase project, open **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. The tables have row-level security enabled and do not allow public or authenticated users to read or insert submissions directly.

## 2. Configure Vercel environment variables

In **Vercel → your portfolio project → Settings → Environment Variables**, add:

- `SUPABASE_URL` — the project URL from Supabase **Project Settings → API**.
- `SUPABASE_SERVICE_ROLE_KEY` — the server-only `service_role` secret from Supabase **Project Settings → API**.

Add these variables to the production environment and any preview environments you plan to use, then redeploy. Keep the service role key private; do not use a `VITE_`, `NEXT_PUBLIC_`, or other client-exposed variable name.

## 3. Verify the Vercel project before deploying

This local folder's existing `.vercel` link is associated with a project named `network-security-agent-setup`. Make sure you link this folder to the correct portfolio project before running Vercel deployment commands. If that name is not your portfolio, use `vercel link` and select the intended project. The link is local configuration and has not been changed here.

Never commit `.env.local` or share its contents.

## 4. Test the forms

After deployment, submit a test message and registration. Successful form submissions show an on-page confirmation. In Supabase **Table Editor**, check `contact_submissions` and `registration_submissions`. If a submission fails, check the Vercel function logs for `/api/submit`.

The registration form currently stores interest only; it does not create user accounts or process payments.
