# 🎓 Mentora — Your Personal Learning Companion

> **Mentora** is a smart online tutoring platform that connects students with verified tutors for live one-on-one learning sessions. Think of it as having a school, a tutor, and a study buddy — all in one app.

---

## 🌟 What is Mentora?

Imagine you're a student stuck on a math problem at 8 PM. There's no teacher around. With Mentora, you can:

1. **Instantly connect** with a live tutor who teaches that exact subject
2. **Take a quick test** before the class so the tutor knows where you stand
3. **Join a live video call** with a real tutor who explains things step-by-step
4. **Take another test** after the class to see how much you improved
5. **Rate your tutor** — your honest feedback helps other students
6. **Chat with an AI bot** anytime to get quick answers or practice questions

And if you're a parent, you can track everything your child is learning — from scores to tutor ratings — all from your own dashboard.

---

## 👩‍🎓 For Students

### 📊 Smart Dashboard
Your personal homepage shows everything at a glance:
- **How many sessions** you've completed
- **Your performance graph** — see if your scores are improving over time
- **Subject-wise progress** — which subjects you're strong in and which need more work
- **Weekly activity** — how consistent you've been with your studies

### 🔍 Find a Tutor
Browse through all available tutors on the platform:
- See their **subjects, qualifications, rating**, and **price per session**
- **Filter by subject** — only see tutors who teach Physics, Math, Chemistry, etc.
- View their **availability** — which days and times they're free
- Two modes:
  - **Browse Mode** — explore all registered tutors
  - **Connect Mode** — instantly connect with tutors who are **currently online** and ready to teach

### 📅 Book a Slot
Don't want to study right now? Book a session for later:
- Pick a tutor → choose a day and time → send a request
- The tutor gets notified and can **accept or decline**
- Once accepted, both you and the tutor get a **"Join Session"** button at the scheduled time

### 📝 Smart Assessments (Pre & Post Tests)
Before every tutoring session, you take a quick **AI-generated quiz** on the topic:
- **Pre-Test** — taken *before* the session to measure your starting level
- **Post-Test** — taken *after* the session to measure what you learned
- The difference between your pre and post scores is your **Score Delta** — this tells you exactly how much you improved

### 📞 Live Video Sessions
Connect face-to-face with your tutor through **real-time video calls**:
- Powered by **WebRTC** — no need to install Zoom or any other app
- Works right in your browser
- Both student and tutor join the same room
- Automatic redirection back to the dashboard when the call ends

### 💳 Payments
Pay for your tutoring sessions securely:
- **Stripe integration** for real payments (when enabled)
- **Simulation mode** for testing — no real money needed during development
- Payment is processed before each session

### 📚 Session History
View all your past sessions in one place:
- See the topic, tutor name, date, and your pre/post test scores
- Track your learning journey over time

### 🤖 AI Study Buddy (MentorAI)
A **floating chat bot** available on every student page:
- Ask it **any academic question** — "Explain photosynthesis", "What is Newton's third law?"
- Ask it to **generate practice questions** — "Give me 5 MCQs on trigonometry"
- It responds like a friendly tutor — simple language, examples, and encouragement
- Powered by **Groq AI** (Llama 3.3 70B model) for fast, intelligent responses
- Available **24/7** — study anytime, even when no tutor is online

### 🔔 Notifications & Doubts
- Upload a **photo of a question** you're stuck on
- Get matched with a tutor who can help
- Receive notifications about session updates

---

## 👨‍🏫 For Tutors

### 📊 Tutor Dashboard
A command center for managing your tutoring business:
- See your **total sessions, completed sessions, and earnings**
- **Active/Inactive toggle** — flip a switch to go online or offline
  - When **Active**: students can find and connect with you instantly
  - When **Inactive**: you won't appear in student search results
- Quick access to all your pages

### 📈 Analytics
Detailed performance metrics:
- **Total sessions**, **completed sessions**, and **completion rate**
- **Average rating** from student reviews
- **Score delta** — how much your students improve on average
- **Rating distribution** — how many 5-star, 4-star, etc. ratings you've received
- **Monthly session trend** — chart showing your sessions over the last 6 months
- **Subject breakdown** — which topics you teach most
- **Recent student reviews** — read what students are saying about you

### 💰 Wallet
Track your earnings:
- See your **total earnings** and **pending payments**
- View transaction history — which sessions earned you how much
- Earnings calculated based on your **hourly rate**

### 👤 Profile Management
Set up your tutor profile:
- Add your **subjects, bio, experience, and qualifications**
- Set your **availability** (which days and times you're free)
- Set your **hourly rate**
- Upload a **demo video** to show your teaching style

### 📋 Session Management
- View all your **upcoming and past sessions**
- **Accept or decline** booking requests from students
- **Join video calls** at the scheduled time
- Share documents with students during sessions

### ✅ Tutor Verification
New tutors take an **AI-generated verification quiz** during registration:
- Tests your knowledge in your chosen subjects
- A **verification badge** shows students you're a qualified tutor

---

## 👨‍👩‍👧 For Parents

### 🔐 Separate Login
Parents have their own dedicated login page — separate from students and tutors.

### 📊 Parent Dashboard
Monitor your child's education at a glance:
- See **linked students** (your children on the platform)
- View their **recent sessions** — who they studied with, what topic, and when
- Track their **progress** — are their scores improving?
- View **payment history** — how much was spent on tutoring

### 📈 Learning Analytics
Deep dive into your child's performance:
- **Pre vs Post test scores** for each session — see exactly how much they improved
- **Question-level breakdown** — which questions they got right and wrong
- **Subject performance** — which subjects need more attention

### ⭐ Tutor Reviews Audit
See how your child's tutors are performing:
- View all **tutor ratings** given by your child
- Read **feedback** and **score improvements** per session
- Make informed decisions about continuing with a tutor

---

## 🏗️ How It's Built (Tech Stack)

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS + Custom CSS Design System |
| **Backend** | Express.js, TypeScript, Node.js |
| **Database** | Firebase Firestore (Cloud NoSQL) |
| **Authentication** | Firebase Auth (Google Sign-in + Email) |
| **Video Calls** | WebRTC (Peer-to-peer, no external service) |
| **AI Chatbot** | Groq AI (Llama 3.3 70B) |
| **AI Quizzes** | Gemini / Groq AI — auto-generated assessments |
| **Payments** | Stripe (with dev-mode simulation fallback) |
| **Charts** | Recharts library |
| **Icons** | Lucide React |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or above)
- A **Firebase project** with Firestore and Authentication enabled
- (Optional) **Stripe** keys for real payments
- (Optional) **Groq API key** for the AI chatbot

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/mad-codes7/Mentora.git
cd Mentora

# 2. Install server dependencies
cd server
npm install

# 3. Set up server environment variables
# Create a .env file in the server folder with:
#   FIREBASE_PROJECT_ID=your_project_id
#   FIREBASE_CLIENT_EMAIL=your_service_account_email
#   FIREBASE_PRIVATE_KEY="your_private_key"
#   PORT=5000
#   GROQ_API_KEY=your_groq_key (for AI chatbot)

# 4. Start the server
npm start

# 5. In a new terminal, install client dependencies
cd ../client
npm install

# 6. Set up client environment variables
# Create a .env.local file in the client folder with your Firebase config

# 7. Start the client
npm run dev
```

### Open in Browser
- **Client**: http://localhost:3000
- **Server API**: http://localhost:5000

---

## 📁 Project Structure

```
Mentora/
├── client/                    # Frontend (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (student)/     # Student pages (dashboard, find-tutor, etc.)
│   │   │   ├── (tutor)/       # Tutor pages (dashboard, analytics, wallet)
│   │   │   ├── (parent)/      # Parent pages (dashboard, analytics, reviews)
│   │   │   ├── room/          # Video call room (WebRTC)
│   │   │   └── (auth)/        # Login & Signup pages
│   │   ├── common/            # Shared components (Navbar, Footer, Auth)
│   │   ├── features/          # Feature-specific components
│   │   ├── hooks/             # Custom React hooks
│   │   └── config/            # Types, subjects, Firebase config
│   └── public/                # Static assets
│
├── server/                    # Backend (Express)
│   └── src/
│       ├── controllers/       # Route handlers
│       ├── routes/            # API route definitions
│       └── services/          # Business logic & Firebase queries
│
└── readme1.md                 # This file!
```

---

## 🎯 Key Flows

### Student Learns a Topic
```
Student opens app
    → Searches for a topic (e.g., "Optics")
    → Takes a Pre-Test (AI-generated quiz)
    → Connects with an online tutor OR books a future slot
    → Joins a live video session
    → Takes a Post-Test after the session
    → Rates the tutor
    → Views improvement in their dashboard
```

### Tutor Teaches a Session
```
Tutor logs in
    → Toggles "Active" to go online
    → Receives a student request
    → Accepts and joins the video call
    → Teaches the session
    → Views analytics and earnings in their dashboard
```

### Parent Monitors Progress
```
Parent logs in
    → Views linked student's dashboard
    → Checks session history and score improvements
    → Reviews tutor ratings and feedback
    → Sees analytics breakdown by subject
```

---

## 💡 What Makes Mentora Special?

| Feature | Why It Matters |
|---------|---------------|
| **Pre & Post Tests** | Objectively measures learning — not just "I think I understood" |
| **AI Tutor Bot** | 24/7 study help, even when no human tutor is available |
| **Live Video (No App Install)** | Works right in the browser — nothing to download |
| **Parent Dashboard** | Parents stay involved without being intrusive |
| **Smart Tutor Matching** | Matches students with tutors who teach the right subjects |
| **Tutor Verification** | Only qualified tutors — tested before they can teach |
| **Active/Inactive Toggle** | Tutors control when they're available — no spam requests |

---

<p align="center">
  Made with ❤️ by <strong>Team Mentora</strong>
</p>
                                                                                                                                                                                                                                                                                                                          