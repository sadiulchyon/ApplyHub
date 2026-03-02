# Job Tracker

A personal job application tracker built with React + Firebase.

## Stack
- React (frontend)
- Firebase Auth (login/signup)
- Firestore (per-user database)
- Firebase Hosting (deployment)

---

## Setup Instructions

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/job-tracker.git
cd job-tracker
npm install
```

### 2. Create a Firebase project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it (e.g. `job-tracker`) → Create
3. In the project dashboard:
   - **Authentication** → Get started → Email/Password → Enable → Save
   - **Firestore Database** → Create database → Start in production mode → Choose region → Done

### 3. Get your Firebase config
1. Project Settings (gear icon) → Your apps → **Add app** → Web (`</>`)
2. Register the app → copy the `firebaseConfig` object
3. Paste it into `src/firebase.js` replacing the placeholder values

### 4. Deploy Firestore security rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, accept defaults
firebase deploy --only firestore:rules
```

### 5. Run locally
```bash
npm start
```

### 6. Build and deploy to Firebase Hosting
```bash
npm run build
firebase init hosting     # public dir = build, single-page app = yes
firebase deploy --only hosting
```

Your app will be live at `https://YOUR_PROJECT_ID.web.app`

---

## Sharing with friends
- Share the deployed URL
- Each person creates their own account
- Data is completely private per user (enforced by Firestore rules)
