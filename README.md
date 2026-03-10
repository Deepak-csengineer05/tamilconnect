# 🎥 TamilConnect — Video Chat for Tamil Nadu

> Random video chat platform built exclusively for the people of Tamil Nadu, India. Think Ome.tv, but smarter, more modern, and Tamil Nadu-focused.

**உங்கள் மக்களோடு பேசுங்கள்** — _Talk with your people_

---

## ✨ Features

- 🔐 **Authentication** — Firebase Google OAuth + Email/Password login
- 📝 **Profile Setup** — Choose your district, language, and interests
- 🧠 **Smart Matchmaking** — Interest-based + language-aware matching via Socket.io
- 🎥 **HD Video Chat** — Peer-to-peer WebRTC video/audio via PeerJS
- 💬 **Text Chat** — Real-time messaging with emoji support alongside video
- 🛡️ **Report & Moderation** — One-click reporting with auto-flag system
- 📱 **Fully Responsive** — Mobile-first design, works on all devices
- 🌙 **Dark Mode** — Premium dark theme with Tamil Nadu color accents

---

## 🧱 Tech Stack

| Layer | Technologies |
|-------|------------|
| **Frontend** | React, Vite, Tailwind CSS, Framer Motion |
| **Auth** | Firebase (Google OAuth + Email/Password) |
| **Video** | PeerJS (WebRTC) |
| **Real-time** | Socket.io |
| **Backend** | Node.js, Express |
| **Database** | MongoDB + Mongoose |
| **Token Verification** | Firebase Admin SDK |

---

## 📁 Project Structure

```
tamilconnect/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Navbar, VideoBox, TextChat, InterestTags, ReportModal
│   │   ├── pages/              # Landing, Login, Register, Setup, Chat, Profile
│   │   ├── context/            # AuthContext (Firebase auth state)
│   │   ├── firebase.js         # Firebase config
│   │   ├── App.jsx             # Routes + protected routes
│   │   └── main.jsx            # Entry point
│   ├── index.html
│   └── vite.config.js
│
├── server/                     # Node.js + Express backend
│   ├── config/db.js            # MongoDB connection
│   ├── models/                 # User, Report schemas
│   ├── routes/                 # Auth, Report API routes
│   ├── socket/matchmaking.js   # Smart matchmaking algorithm
│   ├── middleware/verifyToken.js
│   └── index.js                # Server entry point
│
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v18+
- MongoDB instance (local or Atlas)
- Firebase project with Auth enabled

### 1. Clone and install

```bash
git clone <your-repo-url>
cd tamilconnect

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Configure environment variables

**Client** — Copy `client/.env.example` to `client/.env`:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_BACKEND_URL=http://localhost:5000
VITE_PEERJS_HOST=0.peerjs.com
VITE_PEERJS_PORT=443
VITE_PEERJS_PATH=/
```

**Server** — Copy `server/.env.example` to `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tamilconnect
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
CLIENT_URL=http://localhost:5173
```

### 3. Run the app

```bash
# Terminal 1: Start backend
cd server
node index.js

# Terminal 2: Start frontend
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🌐 Deployment

### Frontend → Vercel
1. Connect your GitHub repo to Vercel
2. Set root directory to `client`
3. Add all `VITE_*` environment variables in Vercel dashboard
4. Deploy!

### Backend → Render
1. Connect your GitHub repo to Render
2. Set root directory to `server`
3. Set start command: `node index.js`
4. Add all server environment variables
5. Enable "Auto-deploy on push"

---

## 🎨 Design

- **Color Palette**: Saffron (#FF6B00), Deep Red (#C0392B), Dark (#0A0A0F)
- **Fonts**: Poppins (English), Noto Sans Tamil (Tamil)
- **UI Style**: Glassmorphism, gradients, micro-animations
- **Responsive**: Mobile-first, works on all screen sizes

---

## 📸 Screenshots

> _Coming soon — add screenshots of your deployed app here_

---

## 📄 License

MIT — Feel free to use and modify for your own projects.
