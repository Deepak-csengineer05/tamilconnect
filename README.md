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

### 2. Run the app

```bash
# Terminal 1: Start backend
cd server
node index.js

# Terminal 2: Start frontend
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.
## 🎨 Design

- **Color Palette**: Saffron (#FF6B00), Deep Red (#C0392B), Dark (#0A0A0F)
- **Fonts**: Poppins (English), Noto Sans Tamil (Tamil)
- **UI Style**: Glassmorphism, gradients, micro-animations
- **Responsive**: Mobile-first, works on all screen sizes

---

## 📸 Screenshots

> _Coming soon — add screenshots of your deployed app here_

---
