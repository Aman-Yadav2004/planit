# Supabase Email Setup Guide (Option C)

## Setup Supabase Built-in Email Service

Supabase has a native email service powered by **Resend** that's included with every project.

### Step 1: Enable Email in Supabase Dashboard

1. Go to your **Supabase Project Dashboard**
2. Navigate to **Settings → Auth → Email Settings**
3. Ensure these are configured:
   - **Enable Email Signup** ✅
   - **Send Signup Confirmation Email** ✅ (optional)
   - **Email Rate Limit**: 14 emails per hour (default is fine)

### Step 2: Configure Email Templates

1. Still in **Auth Settings**, go to **Email Templates**
2. You'll see templates for:
   - Confirmation email
   - Invite link
   - Magic link
   - Recovery link
   - Re-authentication link

3. Keep defaults or customize as needed (we're using our custom Edge Function for invitations)

### Step 3: Deploy the Edge Function

```bash
# From your project root directory
supabase functions deploy send-invitation-email
```

Or via Supabase Dashboard:
1. Go to **Edge Functions**
2. Click **Create a new function**
3. Name it: `send-invitation-email`
4. Paste the code from `/supabase/functions/send-invitation-email/index.ts`
5. Click **Deploy**

### Step 4: Verify Function Permissions

In Supabase dashboard, make sure your Edge Function has these environment variables:
- `SUPABASE_URL` (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-set)

### Step 5: Test the Setup

1. Go to **Profile** page in Plan-IT
2. Click **Invite Team Member**
3. Enter an email address and select a role
4. Click **Send Invite**
5. Check the email inbox (might take 30-60 seconds)

### Expected Email Result

The invited user will receive an email with:
- ✅ Organization name and invitation details
- ✅ Inviter's name
- ✅ Role they're being invited as
- ✅ Direct link to accept (e.g., `https://yoursite.com/join-org/org-id?token=xyz`)
- ✅ Expiration notice (7 days)

### Troubleshooting

**Email not arriving?**
- Check spam/junk folder
- Verify email address is correct
- Check Supabase Dashboard → Logs → Edge Functions for errors
- Ensure function is deployed (status should be "Active")

**Rate limiting?**
- Supabase allows 14 emails per hour by default
- For testing, use different email addresses each time
- Contact Supabase support for higher limits

**Function showing errors?**
1. Go to **Edge Functions** in Supabase Dashboard
2. Click on `send-invitation-email`
3. Check the **Logs** tab for error messages
4. Common issues:
   - Missing service role key
   - Typo in email address
   - Invalid organization ID

### Advanced: Custom Email Sender Name

To change the "from" address in emails:

1. Go to **Settings → Auth → Email Settings**
2. Update **Sender email** (must be verified domain)
3. Default is `noreply@mail.supabase.io`

### How It Works Under the Hood

When you invite someone:
1. **Frontend** calls `send-invitation-email` Edge Function
2. **Edge Function** receives the invitation details
3. **Function** formats the HTML/text email content
4. **Function** queues email via Supabase's email service
5. **Supabase** sends through Resend infrastructure
6. **Recipient** receives beautiful formatted email with accept link

This is **completely free** and included in your Supabase plan!

---

## FAQ

**Q: Can I customize the email template?**
A: Yes! Modify `/supabase/functions/send-invitation-email/index.ts` and redeploy.

**Q: Will emails work with free Supabase tier?**
A: Yes! Email sending is free on all tiers.

**Q: Can I track if emails were opened?**
A: Supabase doesn't provide open tracking, but you can see if the user accepted the invitation in the database.

**Q: How many invitations can I send?**
A: 14 per hour (default). Contact Supabase for higher limits.

**Q: Do I need a custom domain?**
A: No, it works with `noreply@mail.supabase.io` by default. Custom domain is optional.
