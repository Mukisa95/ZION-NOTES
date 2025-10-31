# Firebase Setup Guide for AI Note Taker

## 1. Firestore Security Rules

The most common issue is restrictive Firestore security rules. Follow these steps:

### Step 1: Access Firestore Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ai-note-taker-bb894`
3. Navigate to **Firestore Database** → **Rules**

### Step 2: Update Security Rules
Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read, write, and delete their own documents
    match /documents/{documentId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### Step 3: Create Composite Index
**IMPORTANT**: You must create a composite index for the query to work:

1. Click this link to create the required index:
   https://console.firebase.google.com/v1/r/project/ai-note-taker-bb894/firestore/indexes?create_composite=ClVwcm9qZWN0cy9haS1ub3RlLXRha2VyLWJiODk0L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9kb2N1bWVudHMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaEAoMbGFzdE1vZGlmaWVkEAIaDAoIX19uYW1lX18QAg

2. Click **"Create Index"**
3. Wait for the index to build (usually takes 1-2 minutes)

### Step 4: Publish Rules
Click **Publish** to apply the new rules.

## 2. Verify Authentication Setup

### Step 1: Check Authentication Providers
1. Go to **Authentication** → **Sign-in method**
2. Ensure **Google** is enabled
3. Add your domain to **Authorized domains**:
   - `zio-notes.vercel.app`
   - `localhost` (for development)

### Step 2: Test Authentication
1. Sign in to your app
2. Check browser console for authentication logs
3. Verify user ID is being passed correctly

## 3. Debugging Steps

### Step 1: Check Browser Console
Open browser developer tools (F12) and look for:
- Authentication logs
- Firestore operation logs
- Error messages

### Step 2: Verify Document Structure
In Firestore Console, check that documents have:
- `userId` field matching the authenticated user
- `name`, `content`, `lastModified`, `wordCount` fields

### Step 3: Test Cross-Device Sync
1. Save a document on one device
2. Sign in on another device
3. Check if document appears in "My Documents"

## 4. Common Issues and Solutions

### Issue: "Failed to open document"
**Solution**: Check Firestore security rules and ensure user is authenticated

### Issue: Documents not syncing across devices
**Solution**: Verify `userId` field in documents matches authenticated user

### Issue: "No saved documents" when documents exist
**Solution**: Check Firestore query permissions and user authentication state

## 5. Testing Checklist

- [ ] User can sign in with Google
- [ ] Save dialog shows "Cloud Storage" when signed in
- [ ] Document saves successfully to Firestore
- [ ] Document appears in "My Documents" library
- [ ] Document opens successfully
- [ ] Document syncs across different devices
- [ ] Incognito mode works (saves locally)
- [ ] Switching between incognito/cloud modes works

## 6. Support

If issues persist:
1. Check browser console for error messages
2. Verify Firebase project configuration
3. Test with a fresh browser session
4. Check network connectivity
