# 🔥 Firebase Cloud Sync - Setup Guide

Your AI Note Taker now has **Google Authentication** and **Cloud Document Storage**! 🚀

## ✨ What's New

- ☁️ **Cloud Sync**: Access your documents from any device
- 🔐 **Google Sign-In**: Secure authentication with your Google account
- 💾 **Auto-backup**: Documents automatically saved to Firestore
- 🌐 **Cross-device**: Seamless sync across all your browsers and devices

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name it: `ai-note-taker`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### Step 2: Get Firebase Config

1. Click the **Web icon** (</>)
2. Register app name: `AI Note Taker`
3. Click **"Register app"**
4. **Copy the `firebaseConfig` object**

### Step 3: Update Configuration

Open `firebase.config.ts` and replace with your config:

```typescript
export const firebaseConfig = {
  apiKey: "AIzaSy...",                    // ← Your API key
  authDomain: "your-app.firebaseapp.com", // ← Your auth domain
  projectId: "your-project-id",           // ← Your project ID
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 4: Enable Google Authentication

1. In Firebase Console: **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable **Google** provider
4. Select your support email
5. Click **Save**

### Step 5: Create Firestore Database

1. In Firebase Console: **Firestore Database** → **Create database**
2. Choose **"Start in test mode"**
3. Select location (closest to you)
4. Click **Enable**

### Step 6: Set Security Rules

In Firestore → **Rules** tab, paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{document} {
      allow read, write: if request.auth != null && 
                          request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.userId;
    }
  }
}
```

Click **"Publish"**

---

## 🧪 Test Locally

```bash
npm run dev
```

1. Open: http://localhost:3000
2. Click **"Sign In"** button
3. Sign in with Google
4. Create a document
5. Check Firebase Console:
   - **Authentication** → You'll see your user
   - **Firestore** → You'll see your document

---

## 🌐 Deploy to Production

### Update Firebase Authorized Domains

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add: `zio-notes.vercel.app`

### Deploy to Vercel

```bash
npm run build
vercel --prod --yes
vercel alias [your-deployment-url] zio-notes.vercel.app
```

---

## 📚 How It Works

### Local Storage (Without Sign In)
- Documents stored in browser IndexedDB
- Only accessible on same browser/device
- Not synced across devices

### Cloud Storage (With Sign In)
- Documents saved to Firestore
- Accessible from any device
- Automatic real-time sync
- Secure (only you can access your documents)

### Data Flow

```
User → Sign In → Google Auth → Firebase
                                    ↓
                            User Creates Document
                                    ↓
                            Save to Firestore
                                    ↓
                            Synced to All Devices
```

---

## 🔒 Security

### Firestore Rules

Each user can only:
- ✅ **Read** their own documents
- ✅ **Create** documents with their userId
- ✅ **Update/Delete** their own documents
- ❌ **Cannot access** other users' documents

### Authentication

- Uses Google's secure OAuth 2.0
- No passwords stored in your app
- Session tokens managed by Firebase
- Automatic token refresh

---

## 📱 User Experience

### When Signed Out
- Local storage only
- Documents saved in browser
- **"Sign In"** button visible
- No cloud sync

### When Signed In
- User profile picture shown
- Cloud sync enabled (☁️ icon)
- Documents auto-save to Firestore
- Access from any device
- **"Sign Out"** option available

---

## 🐛 Troubleshooting

### Error: "Firebase not configured"
**Fix:** Update `firebase.config.ts` with your actual Firebase credentials

### Error: "Popup blocked"
**Fix:** Allow popups for your domain in browser settings

### Error: "Insufficient permissions"
**Fix:** Check Firestore security rules are published

### Documents not syncing
**Fix:** 
1. Check internet connection
2. Verify user is signed in (check profile icon)
3. Check browser console for errors
4. Verify Firestore rules allow access

### Sign-in not working on deployed site
**Fix:** Add your domain to Firebase Authorized domains

---

## 📊 Firestore Data Structure

```
documents (collection)
  └── [documentId]
      ├── id: string
      ├── userId: string          // User's Google ID
      ├── name: string            // Document name
      ├── content: string         // HTML content
      ├── wordCount: number
      ├── lastModified: Timestamp
      └── createdAt: Timestamp
```

---

## 🎯 Production Checklist

Before going live:

- [ ] Firebase project created
- [ ] `firebase.config.ts` updated with real credentials
- [ ] Google Authentication enabled
- [ ] Firestore database created
- [ ] Security rules published
- [ ] Authorized domains configured (add your Vercel domain)
- [ ] App tested locally
- [ ] App deployed to Vercel
- [ ] Sign-in tested on production URL

---

## 💡 Tips

1. **API Keys are Safe**: Firebase API keys can be public (they're restricted by domain)
2. **Test Mode**: Firestore test mode is for development only - switch to production rules before launch
3. **Backups**: Consider enabling Firestore backups in Firebase Console
4. **Analytics**: Enable Firebase Analytics to track usage
5. **Monitoring**: Use Firebase Crashlytics for error tracking

---

## 🚀 You're All Set!

Your AI Note Taker is now a **cloud-powered document editor**!

- Sign in with Google
- Create documents
- Access from anywhere
- Automatic sync

**Happy writing!** ✨

---

## 📞 Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

