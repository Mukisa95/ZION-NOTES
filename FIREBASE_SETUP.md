# 🔥 Firebase Setup Guide

Follow these steps to configure Firebase for your AI Note Taker app:

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `ai-note-taker` (or your preferred name)
4. Disable Google Analytics (optional, you can enable it if needed)
5. Click **"Create project"**

## Step 2: Register Your Web App

1. In your Firebase project, click the **Web icon** (</>)
2. Register app name: `AI Note Taker`
3. **Don't** check "Set up Firebase Hosting" yet
4. Click **"Register app"**
5. **Copy the firebaseConfig object** shown

## Step 3: Update Firebase Configuration

1. Open `firebase.config.ts` in your project
2. Replace the placeholder values with your Firebase config:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 4: Enable Google Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Click on **"Google"**
5. **Enable** the toggle
6. Select a **Project support email** (your email)
7. Click **"Save"**

## Step 5: Set Up Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select a **Cloud Firestore location** (choose closest to you)
5. Click **"Enable"**

## Step 6: Configure Firestore Security Rules

1. In Firestore Database, go to **"Rules"** tab
2. Replace the rules with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write only their own documents
    match /documents/{document} {
      allow read, write: if request.auth != null && 
                          request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.userId;
    }
  }
}
```

3. Click **"Publish"**

## Step 7: Configure Authorized Domains (for Production)

1. In Firebase Console, go to **Build** → **Authentication** → **Settings** → **Authorized domains**
2. Add your Vercel domain: `zio-notes.vercel.app`
3. Add `localhost` (should already be there for development)

## Step 8: Test the Setup

1. Save your changes to `firebase.config.ts`
2. Run `npm run dev`
3. Click the **Sign In** button in your app
4. Sign in with Google
5. Your user should appear in **Authentication** → **Users** in Firebase Console
6. Create a document - it should appear in **Firestore Database** → **documents** collection

## Firestore Data Structure

Your documents will be stored like this:

```
documents (collection)
  ├── {documentId} (document)
      ├── id: string
      ├── userId: string
      ├── name: string
      ├── content: string (HTML)
      ├── lastModified: Timestamp
      ├── createdAt: Timestamp
      └── wordCount: number
```

## Production Security (IMPORTANT!)

Before going live, update Firestore rules to production mode:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{document} {
      // Users can only access their own documents
      allow read: if request.auth != null && 
                     request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && 
                               request.auth.uid == resource.data.userId;
    }
  }
}
```

## Troubleshooting

### Issue: "Firebase not configured"
- Check that `firebase.config.ts` has valid values (not placeholders)

### Issue: "Authentication popup blocked"
- Allow popups for your domain in browser settings

### Issue: "Insufficient permissions"
- Check Firestore security rules
- Ensure user is authenticated

### Issue: "User not signed in automatically"
- Firebase persists auth state in localStorage
- Check browser console for errors

## Next Steps

✅ Firebase is set up!  
✅ Google Sign-In is enabled  
✅ Firestore is ready  
✅ Your app now syncs across devices!

**Happy coding!** 🚀

