# Marketing assets

## launch-email-made-to-last.html
Send-ready broadcast announcing the complete MADE TO LAST. set
(built from `New Designs/Made to Last/MADE_TO_LAST_set_marketing/Listings.md`).

**How to send with Resend:**
1. resend.com → **Broadcasts** → *Create broadcast*
2. Audience: your main audience (the one `RESEND_AUDIENCE_ID` points at)
3. From: your sales sender (same address as `EMAIL_FROM_SALES`)
4. Subject: `MADE TO LAST. is complete` · Preview text: `Three books, one business — and the set saves you $17.`
5. Switch the editor to **HTML/code view** and paste the entire contents of `launch-email-made-to-last.html`
6. Send a **test to yourself first** (check the hero image + button), then schedule/send.

Notes:
- The `{{{RESEND_UNSUBSCRIBE_URL}}}` tag in the footer is filled in by Resend automatically — leave it as-is.
- The hero image deliberately uses the `.png` (not `.webp`) — old email clients don't render WebP. Keep the PNGs hosted.
- More ready copy (per-book launch emails, Pinterest pins, social captions, Reel hooks) lives in
  `New Designs/Made to Last/**/Listings.md`.
