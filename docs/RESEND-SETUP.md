# Resend setup for invitation emails on Render Free

Render Free blocks outbound SMTP ports, so Gmail SMTP will not work there.
Use Resend over HTTPS instead.

## 1. Create a Resend account

Go to https://resend.com/ and create an account.

## 2. Get an API key

Create an API key in the Resend dashboard and copy it.

## 3. Set Render environment variables

Add these in Render:

```env
RESEND_API_KEY=re_your_resend_api_key
MAIL_FROM=ProjectCamp <onboarding@resend.dev>
```

`onboarding@resend.dev` is fine for testing. For real production use, verify your own domain in Resend and use an address on that domain.

## 4. Redeploy

Deploy the latest commit and then send a fresh invitation.

## 5. Expected logs

You should see logs like:

```text
Mail provider configured: Resend API
Sending invitation email via Resend to someone@example.com
Invitation email sent to someone@example.com via Resend
```
