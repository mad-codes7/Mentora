# 🎓 Mentora – Real-Time Smart Tutoring Platform

> Mentora is a real-time 1-on-1 tutoring platform connecting Students, Tutors, and Parents with live WebRTC classrooms, structured assessments, performance analytics, and secure payment integration.

---

# 📌 Project Overview

Mentora is designed as a full-stack, real-time tutoring ecosystem that enables:

* 👨‍🎓 Students to learn through structured sessions
* 👨‍🏫 Tutors to teach and earn
* 👨‍👩‍👧 Parents to monitor performance and spending

The system ensures:

* Pre-session and post-session assessment tracking
* Payment-gated classroom access
* Real-time video and whiteboard collaboration
* Tutor performance scoring
* Parent-level analytics dashboard

---

# 🏗 System Architecture

Frontend (React / Next.js + Tailwind)
↓
Firebase Authentication
↓
Firestore (Real-Time Database)
↓
Firebase Storage
↓
WebRTC (Peer-to-Peer Video + Data)
↓
Razorpay / Stripe (Payments)
↓
External Quiz API

Architecture Type:

* Client-driven architecture
* Firestore as real-time state engine
* Serverless backend approach
* WebRTC for peer-to-peer media streaming

---

# 🛠 Tech Stack

## Frontend

* React / Next.js
* Tailwind CSS
* WebRTC API
* Canvas API (Whiteboard)
* Chart Library (Recharts / Chart.js)

## Backend & Infrastructure

* Firebase Authentication
* Firebase Firestore
* Firebase Storage
* Firebase Cloud Functions (optional)

## Payments

* Razorpay (India)
* Stripe (Global)

## Utilities

* UUID
* Date-fns

---

# 👥 Developer Ownership

This project has 3 developers. Each developer owns their respective module strictly.

| Developer | Module Ownership |
| --------- | ---------------- |
| Dev A     | Student Module   |
| Dev B     | Tutor Module     |
| Dev C     | Parent Module    |

Rules:

* No developer edits another module’s internal files.
* Shared logic must go inside `/components/shared`, `/hooks`, or `/utils`.
* Firestore schema changes must be discussed before implementation.

---

# 👨‍🎓 Student Module (Dev A)

## Features

* Authentication (Email/Google)
* Profile setup (class level, exam focus)
* Topic selection
* Pre-session assessment
* On-demand tutor matching
* Scheduled session booking
* Payment gateway access
* WebRTC classroom participation
* Post-session assessment
* Tutor rating submission
* Progress tracking dashboard

## Responsibilities

* Create `sessions` document
* Write pre and post assessments
* Trigger tutor search
* Submit rating data

---

# 👨‍🏫 Tutor Module (Dev B)

## Features

* Tutor verification quiz
* Subject setup
* Availability configuration
* Session acceptance (on-demand & scheduled)
* Wallet balance display
* Performance analytics
* Upload teaching materials during session

## Responsibilities

* Accept sessions
* Update session status
* Upload documents to Firebase Storage
* Track rating metrics

---

# 👨‍👩‍👧 Parent Module (Dev C)

## Features

* Authentication
* Link student account
* Live session status monitoring
* View session history
* Performance breakdown (pre vs post scores)
* Financial summary of total spending
* Review audit (ratings given by student)

## Responsibilities

* Read-only monitoring
* Analytics visualization

---

# 🗃 Firestore Database Schema

## 1. users Collection

Fields:

* uid (Document ID)
* roles[] ("student", "tutor", "parent")
* profile {}
* studentData {}
* tutorData {}
* parentData {}

---

## 2. sessions Collection

Fields:

* sessionId
* studentId
* tutorId
* topic
* meetingType (on_demand / scheduled)
* status (searching, pending_payment, paid_waiting, in_progress, completed, cancelled)
* paymentStatus (pending, success, failed)
* scheduledStartTime
* actualStartTime
* endTime
* durationLimitMinutes
* paymentTransactionId
* sharedDocuments[]
* preAssessmentId
* postAssessmentId
* ratingId

Subcollection:

webrtc_signaling

* offer
* answer
* callerCandidates
* calleeCandidates

---

## 3. assessments Collection

Fields:

* assessmentId
* sessionId
* userId
* type (pre_session / post_session)
* topic
* scoreData {}
* quizPayload[]
* takenAt

---

## 4. ratings Collection

Fields:

* ratingId
* sessionId
* tutorId
* studentId
* metrics {}
* createdAt

---

# 📁 Folder Structure

/src
/modules
/student
/tutor
/parent
/components
/webrtc
/whiteboard
/payment
/shared
/hooks
/firebase
/utils
/constants
/types

Rules:

* No cross-module file editing.
* Shared UI components go inside `/shared`.
* Firebase configuration must remain centralized.

---

# 🔀 Git Workflow & Conflict Prevention

Branch Strategy:

* main → production-ready
* develop → integration branch
* feature/<module>-<feature-name>

Example:

* feature/student-preassessment
* feature/tutor-wallet
* feature/parent-analytics

Rules:

1. Never push directly to main.
2. Always pull latest develop before creating PR.
3. One feature = one branch.
4. Resolve conflicts locally before PR.
5. Do not modify another module without discussion.

---

# 🔌 API Contract (Assessment)

Expected Quiz API Format:

[
{
questionText: string,
options: string[],
correctAnswer: string
}
]

Rules:

* API response structure must not change without approval.
* Scoring logic must remain consistent for analytics.

---

# 🎥 WebRTC Flow

1. Student creates session.
2. Tutor accepts.
3. Offer stored in Firestore.
4. Answer returned by peer.
5. ICE candidates exchanged.
6. Session status → in_progress.
7. Timer ends → status → completed.

Auto-close conditions:

* Timer reaches zero.
* User manually leaves.

---

# 💳 Payment Flow

1. Tutor accepts session.
2. session.status = pending_payment.
3. Payment popup triggered.
4. On success:

   * paymentStatus = success
   * status = paid_waiting
5. Join button unlocked.
6. Session starts → in_progress.

---

# 🔐 Environment Variables

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_RAZORPAY_KEY=
VITE_STRIPE_KEY=
VITE_QUIZ_API_URL=

Rules:

* Never commit `.env` file.
* Share credentials securely.

---

# ⚙️ Setup Instructions

1. Clone repository
2. Install dependencies
   npm install
3. Start development server
   npm run dev

Firebase Setup:

* Create Firebase project
* Enable Firestore
* Enable Authentication
* Enable Storage
* Configure environment variables

---

# 📊 Rating Algorithm

scoreDelta = postTestScore − preTestScore

finalRating =
(0.6 × starRating) +
(0.4 × normalizedScoreDelta)

---

# 🧪 Basic Testing Checklist

* Pre-test stored correctly
* Session status transitions correctly
* Payment blocks entry until success
* WebRTC connects successfully
* Timer auto-ends session
* Post-test stored correctly
* Rating updates properly

---

END OF README – Mentora
