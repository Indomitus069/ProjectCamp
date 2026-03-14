# Gmail setup for invitation emails – step by step

Follow these steps in order. Do not skip steps.

---

## Step 1: Open Google Account Security

1. In your browser, go to: **https://myaccount.google.com/**
2. Sign in with the Gmail account you want to use for sending invites.
3. In the left sidebar, click **Security**.

---

## Step 2: Turn on 2-Step Verification

1. On the Security page, find **"How you sign in to Google"**.
2. Click **2-Step Verification**.
3. If it says **OFF**, click it and follow the prompts to turn it **ON**.
4. If it already says **ON**, go to the next step.

---

## Step 3: Create an App Password

1. Go back to **Security**: https://myaccount.google.com/security
2. Under "How you sign in to Google," find **App passwords** and click it.
   - If you don’t see "App passwords," make sure 2-Step Verification is ON, then refresh the page.
3. You may need to sign in again. Enter your Google password.
4. Click **Select app** → choose **Mail**.
5. Click **Select device** → choose **Other (Custom name)**.
6. Type: **ProjectCamp** (or any name), then click **Generate**.
7. Google shows a **16-character password** (like `abcd efgh ijkl mnop`).
8. **Copy this password** and keep it somewhere safe. You won’t see it again.
   - When you paste it into `.env`, **remove all spaces** (e.g. `abcdefghijklmnop`).

---

## Step 4: Open your backend `.env` file

1. In your project folder, go to the **backend** folder.
2. Open the file named **`.env`** in a text editor.
   - If `.env` doesn’t exist, copy **`.env.example`** and rename the copy to **`.env`**.

---

## Step 5: Add Gmail settings to `.env`

1. In **backend/.env**, add these lines (or change them if they already exist):

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your.email@gmail.com
MAIL_PASS=paste-your-16-char-app-password-no-spaces
MAIL_FROM=ProjectCamp <your.email@gmail.com>
```

2. Replace **`your.email@gmail.com`** with your real Gmail address (in both `MAIL_USER` and `MAIL_FROM`).
3. Replace **`paste-your-16-char-app-password-no-spaces`** with the App Password from Step 3, **with no spaces** (e.g. `abcdefghijklmnop`).
4. Save the file.

---

## Step 6: Restart the backend server

1. Stop your backend server if it’s running (e.g. press `Ctrl+C` in the terminal where it runs).
2. Start it again, for example:
   - `npm run dev` (if you use that script), or
   - `node server.js`
3. Wait until you see the message that the server is running (e.g. "Server running on port 8000").

---

## Step 7: Test sending an invitation

1. Open your app in the browser and go to the **Team** page.
2. Click **Invite Member**.
3. Enter an email address you can check (e.g. another of your emails).
4. Choose a role and click **Send Invitation**.
5. Check that invitation:
   - Appears in the **Invitations** list on the Team page.
   - An email arrives at the address you entered (check spam if needed).

---

## If something doesn’t work

- **"App passwords" option is missing**  
  Make sure 2-Step Verification is ON, then refresh the Security page.

- **"Invalid credentials" or "Username and Password not accepted"**  
  Use the **App Password** from Step 3, not your normal Gmail password. Remove all spaces when pasting into `MAIL_PASS`.

- **No email received**  
  Check the recipient’s spam/junk folder. Confirm `MAIL_USER` and `MAIL_PASS` in `.env` are correct and that you restarted the backend after changing `.env`.
