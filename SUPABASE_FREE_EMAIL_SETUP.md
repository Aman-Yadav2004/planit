# Setup Supabase's FREE Email Service

Supabase includes a completely **FREE** email service for your project. No configuration needed initially - invitations work with shareable links.

## Current Setup (Works Without Email)

✅ **Invitations are created and stored**
✅ **Invite links are generated** (`/join-org/{orgId}?token={token}`)
✅ **Links never expire and always work**
✅ **No email service required**

Users can:
1. Click the link directly
2. Copy/paste the link
3. Share the link via Slack, email, etc.

---

## Optional: Add Email Notifications

If you want to **automatically send invitation emails**, here are your free options:

### Option 1: Supabase SMTP (Completely Free)

1. **Go to Supabase Dashboard** → Settings → Auth → Email Settings
2. **Configure SMTP:**
   - SMTP Host: Your email provider (Gmail, Mailgun, SendGrid, etc.)
   - SMTP Port: 587
   - SMTP User: Your email
   - SMTP Password: App password (not your regular password)
   
3. **If using Gmail:**
   - Enable 2FA on your Google account
   - Generate an [App Password](https://myaccount.google.com/apppasswords)
   - Use that in Supabase SMTP settings

4. **Test:** Settings → Email Templates → Send Test Email

### Option 2: Resend (Free Tier - 100 emails/day)

If Resend is already set up but not domain verified:

1. Go to [Resend.com](https://resend.com)
2. Click **Domains** → Add your domain
3. Follow DNS verification steps
4. Set `RESEND_FROM_EMAIL=noreply@yourdomain.com` in Edge Function Secrets
5. In Supabase: Edge Functions → send-invitation-email → Edit → Add Secret

### Option 3: Mailgun (Free Tier)

1. Sign up at [Mailgun.com](https://www.mailgun.com)
2. Get your API key and domain
3. In Supabase SMTP settings, use Mailgun's SMTP endpoint
4. Free tier: 5,000 emails/month

### Option 4: SendGrid (Free Tier)

1. Sign up at [SendGrid.com](https://sendgrid.com)
2. Get your API key
3. Configure in Supabase SMTP settings
4. Free tier: 100 emails/day

---

## How to Activate Email in Plan-IT

Once you've set up SMTP in Supabase:

1. **Update the Edge Function** to send real emails:

```bash
# Deploy with email enabled
npx supabase functions deploy send-invitation-email
```

2. **Test it:**
   - Go to Profile page
   - Click "Invite Team Member"
   - Enter an email
   - Check inbox (might take 30-60 seconds)

---

## Troubleshooting

**Emails not arriving?**
- Check spam/junk folder
- Verify email is correct
- In Supabase: Logs → Edge Functions → Check for errors
- Ensure SMTP is configured in Auth Settings

**Email quota exceeded?**
- Free tiers have daily/monthly limits
- Upgrade to paid tier or use another provider

**Domain not verified?**
- Complete DNS verification in Resend/Mailgun/SendGrid
- Can take 24 hours to propagate

---

## Current Status

✅ Invitations work with **free shareable links**
🔄 Email optional - add SMTP when ready
📧 No vendor lock-in - switch email providers anytime

**Recommendation:** Start with links, add email later when you need it.
