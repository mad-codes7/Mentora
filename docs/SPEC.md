# 🎓 Mentora – Full Project Specification

## 1. Student Module (The Learner Experience)

### Authentication & Onboarding
- **Sign Up / Log In View:** Standard email/password or Google OAuth via Firebase.
- **Profile Setup:** UI to input their grade/class level and primary exam focus.
- **Role Toggle Button:** A persistent navigation bar button to switch to the "Tutor Dashboard" (if they have passed the tutor verification).

### Pre-Session & Matching Flow
- **Topic Selection UI:** A dropdown or search bar to select the specific topic they need help with today (e.g., "Algebra", "Thermodynamics").
- **Pre-Assessment View:** A quiz interface that fetches questions from your external API. It includes multiple-choice buttons and a submit action.
- **Pre-Assessment Logic:** Upon submission, the app calculates the score and writes the full quiz data to the assessments Firestore collection.
- **Matchmaking Action:** Two buttons: "Find Tutor Now" (queries tutors currently online) or "Schedule for Later" (opens a date/time picker).

### Payment & Waiting Room
- **Payment Gate UI:** Displays the matched tutor's name, their sessionPrice, and a "Pay to Enter Room" button.
- **Razorpay/Stripe Integration:** Triggers the sandbox payment popup.
- **Status Listener:** The UI listens to the sessions document. Only when paymentStatus updates to "paid" does the "Join Video Call" button unlock.

### The Live Classroom (WebRTC)
- **Video Interface:** Side-by-side or picture-in-picture layout for the 1-on-1 WebRTC video feed.
- **Interactive Whiteboard:** A Canvas API component where mouse/touch events draw on the screen.
- **Chat Box:** Text chat that saves messages either to a subcollection or temporary state.
- **Document Viewer:** A modal or side-panel to view PDFs/images uploaded by the tutor.
- **Strict Countdown Timer:** A highly visible timer at the top of the screen. When it hits 00:00, the WebRTC peerConnection is programmatically closed, and the user is forcefully redirected to the post-session screen.

### Post-Session & Feedback
- **Post-Assessment View:** Similar to the pre-test, fetches a new quiz from the API OR tutor manually creates one, grades it, and saves it to assessments.
- **Rating UI:** A 5-star clickable component and a text area for written feedback.
- **Rating Logic:** Submitting this form writes to the ratings collection, which triggers the backend to calculate the combined rating (Stars + Test Score Delta).

### Student Dashboard
- **Upcoming Sessions View:** A list of scheduled classes with a countdown to when the room opens.
- **Session History Table:** Displays past classes, topics, tutor names, and amounts paid.
- **Progress Charts:** Visual representation (using a lightweight chart library) comparing their pre-test vs. post-test scores over time.

---

## 2. Tutor Module (The Teacher Experience)

### Tutor Verification (For Students Becoming Tutors)
- **"Become a Tutor" Gateway:** A landing page explaining the benefits of tutoring.
- **Verification Quiz View:** A timed, external API MCQ test to prove their competence.
- **Upgrade Logic:** If they pass, update their users document to include the "tutor" role, granting them access to the Tutor Dashboard.

### Profile & Availability Settings
- **Subject Setup UI:** A multi-select form to add subjects they are qualified to teach.
- **Availability Grid:** A calendar or time-slot UI where they toggle which hours they are free to accept scheduled sessions.
- **Pricing Input:** A numeric input field to set their sessionPrice per class.

### Tutor Dashboard & Queue
- **Incoming Requests View:** A real-time list of students requesting an immediate "On-Demand" session or upcoming scheduled sessions.
- **Acceptance Logic:** Clicking "Accept" updates the sessions document with their tutorId and triggers the payment gate for the student.
- **Virtual Wallet Display:** A prominent card showing total simulated earnings (walletBalance).
- **Performance Metrics:** Displays their aggregateRating (the combined score) and reads out written feedback from past students.

### The Live Classroom (Tutor View)
- **Identical WebRTC Interface:** Shares the video, whiteboard, chat, and timer components with the student.
- **Document Upload Button:** An extra tool allowing the tutor to select a file from their device, upload it to Firebase Storage, and instantly share the link in the session.

---

## 3. Parent Module (The Observer Experience)

### Authentication & Linking
- **Sign Up / Log In View:** Standard Firebase Auth.
- **Link Student UI:** An input field asking for the unique studentId. Submitting this adds the ID to the parent's linked_students array in Firestore.

### Real-Time Monitoring Dashboard
- **Live Status Indicator:** A widget using Firestore listeners that turns green and says "In Session" when a linked student's sessions document changes to "in-progress".
- **Recent Activity Feed:** A scrolling list of the student's latest completed sessions, showing the tutor's name and the duration.

### Deep Analytics View
- **Performance Breakdown:** A detailed UI that pulls from the assessments collection. It shows exactly which questions the student got wrong in the pre-test and whether they got them right in the post-test.
- **Financial Overview:** A summary card totaling the amount spent on all paid sessions so far.
- **Tutor Review Audit:** A view allowing the parent to see the ratings and feedback their child left for tutors.

---

## Firestore Schema

### 1. `users` Collection
- `uid` (String): Document ID (Matches Firebase Auth UID)
- `roles` (Array of Strings): e.g., `["student"]` or `["student", "tutor"]` or `["parent"]`
- `profile` (Map):
  - `fullName` (String)
  - `email` (String)
  - `createdAt` (Timestamp)
- `studentData` (Map - Null if not a student):
  - `classLevel` (String)
  - `examFocus` (Array of Strings)
  - `linkedParentIds` (Array of Strings)
- `tutorData` (Map - Null if not a tutor):
  - `isVerified` (Boolean)
  - `subjects` (Array of Strings)
  - `availability` (Array of Maps)
  - `teachingMode` (String): "Online", "Offline", or "Both"
  - `sessionPrice` (Number)
  - `walletBalance` (Number)
  - `aggregateRating` (Number)
  - `demoVideoUrl` (String)
- `parentData` (Map - Null if not a parent):
  - `linkedStudentIds` (Array of Strings)

### 2. `sessions` Collection
- `sessionId` (String): Auto-generated ID
- `studentId` (String)
- `tutorId` (String)
- `topic` (String)
- `meetingType` (String): "on_demand" or "scheduled"
- `status` (String): "searching" | "pending_payment" | "paid_waiting" | "in_progress" | "completed" | "cancelled"
- `scheduledStartTime` (Timestamp)
- `actualStartTime` (Timestamp)
- `endTime` (Timestamp)
- `durationLimitMinutes` (Number)
- `paymentTransactionId` (String)
- `paymentStatus` (String): "pending" | "success" | "failed"
- `preAssessmentId` (String)
- `postAssessmentId` (String)
- `ratingId` (String)
- `sharedDocuments` (Array of Strings)
- ↳ `webrtc_signaling` (Subcollection):
  - `offer` (Map)
  - `answer` (Map)
  - `callerCandidates` (Collection)
  - `calleeCandidates` (Collection)

### 3. `assessments` Collection
- `assessmentId` (String): Auto-generated ID
- `sessionId` (String)
- `userId` (String)
- `type` (String): "pre_session" or "post_session"
- `topic` (String)
- `scoreData` (Map): `totalScore`, `maxScore`
- `quizPayload` (Array of Maps): `questionText`, `options`, `studentAnswer`, `correctAnswer`, `isCorrect`
- `takenAt` (Timestamp)

### 4. `ratings` Collection
- `ratingId` (String): Auto-generated ID
- `sessionId` (String)
- `tutorId` (String)
- `studentId` (String)
- `metrics` (Map):
  - `studentStarRating` (Number)
  - `feedbackText` (String)
  - `preTestScore` (Number)
  - `postTestScore` (Number)
  - `scoreDelta` (Number)
  - `finalCalculatedRating` (Number)
- `createdAt` (Timestamp)

---

## UI/UX Design Guidelines

### Color System (Tailwind)
- **Backgrounds:** `bg-white` for cards, `bg-slate-50` / `bg-gray-50` for app background
- **Primary Actions (Blue):** `bg-blue-600` for buttons, `blue-700` for hover
- **Text:** `text-slate-900` for headings, `text-slate-600` for secondary text
- **Alerts:** `bg-red-500` for errors/end call, `bg-emerald-500` for success/high scores

### Role-Specific UX
- **Student UI:** Encouraging and minimal. Large search bar front-and-center. Clean tutor profile cards.
- **Tutor UI:** Professional and organized. Sidebar navigation. Large "Wallet Balance" widget.
- **Parent UI:** Data-driven and reassuring. Grid dashboard with visual charts.

### Live Classroom Design
- **Whiteboard:** Takes up 80% of the screen (Canvas API, white background)
- **Video Feeds:** Floating, rounded rectangles in top-right corner with `shadow-lg`
- **Control Bar:** Dark bottom bar with circular buttons (Mute, Video Toggle, Screen Share, Leave)
- **Timer:** High-contrast pill at top center, `font-mono text-blue-600`, turns red at 5 min remaining
