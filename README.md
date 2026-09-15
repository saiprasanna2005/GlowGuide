# GlowGuide — Your Personal Beauty & Wellness Planner

## Overview

GlowGuide is a full-stack beauty and wellness planning web application designed to help users organize skincare, makeup, haircare, beauty routines, products, events, journaling, and personalized looks in one place.

The application uses a modern client-server architecture with a vanilla JavaScript frontend, Node.js and Express.js backend, MySQL database, REST APIs, and JWT-based authentication.

Each user has their own account and their own data. Profile information, routines, routine progress, beauty products, journal entries, events, saved looks, settings, and analytics are stored securely in the backend database rather than only in the browser.

GlowGuide is a planning and organization tool — not a medical, dermatology, or diagnostic application.

---

## Problem Statement

Beauty routines involve a surprising amount of planning — remembering skincare steps, preparing for events, keeping track of beauty products, maintaining routines, saving looks, and noticing which habits actually stick.

Most of this information is scattered across notes apps, photos, reminders, and memory.

GlowGuide brings these activities together into one organized application where users can create a personal beauty profile, manage routines, track progress, plan events, maintain a beauty product collection, write journal entries, save looks, and view personalized insights.

The full-stack architecture also allows multiple users to have separate accounts and securely manage their own information.

---

## Features

### Beauty Profile

* Personalized onboarding flow
* Beauty goals
* Routine preferences
* Style preferences
* Profile management
* Backend database persistence

### Dashboard

* Personalized greeting
* Glow Consistency score
* Today's routine
* Quick statistics
* Weekly progress
* Personalized account data
* Backend-driven analytics

### My Routine

* Morning routines
* Evening routines
* Add routine steps
* Delete routine steps
* Complete routine steps
* Track completion history
* Backend persistence
* User-specific routines

### Glam Planner

* Create beauty preparation events
* Weddings
* Parties
* Shoots
* Other special occasions
* Event countdowns
* Automatically generated preparation timelines
* Task tracking
* Event-specific data stored in MySQL

### Beauty Vault

* Personal beauty product collection
* Skincare
* Makeup
* Haircare
* Fragrance
* Tools
* Other products
* Search and filtering
* Product ratings
* Favorites
* User-specific product data

### Beauty Journal

* Create journal entries
* Mood tracking
* Look of the day
* Products used
* Personal notes
* Saved journal history
* User-specific database storage

### Look Planner

* Select occasion
* Select style
* Select available time
* Generate structured look plans
* Base
* Eyes
* Brows
* Blush
* Lips
* Hair
* Final Touch
* Save personalized looks

### Insights

* Weekly consistency
* Monthly consistency
* Routine progress
* Category distribution
* Event preparation progress
* Personalized Glow insights
* Analytics generated from backend data

### Settings

* Edit profile
* Theme preferences
* Notification preferences
* Account settings
* Export user data
* Import user data
* Reset application data
* Backend-synchronized settings

### Authentication

* User registration
* User login
* Secure password hashing
* JWT authentication
* Protected API routes
* HTTP-only authentication cookies
* Logout
* User-specific data isolation

---

## Tech Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript
* Chart.js
* Google Fonts

  * Fraunces
  * Manrope
  * JetBrains Mono

### Backend

* Node.js
* Express.js
* REST APIs
* JavaScript
* bcrypt
* JSON Web Tokens (JWT)
* HTTP-only cookies

### Database

* MySQL
* MySQL Workbench
* Relational database design
* Foreign keys
* User-specific data relationships

### Development Tools

* Visual Studio Code
* Git
* GitHub
* npm
* Postman / browser API testing
* MySQL Workbench

---

## Architecture

GlowGuide follows a client-server architecture:

```text
User
  │
  ▼
GlowGuide Frontend
HTML + CSS + JavaScript
  │
  │ REST API Requests
  ▼
Node.js + Express.js Backend
  │
  ├── Authentication
  ├── Profile Management
  ├── Routine Management
  ├── Analytics
  ├── Events & Tasks
  ├── Beauty Products
  ├── Journal
  ├── Look Plans
  └── Settings
  │
  ▼
MySQL Database
```

The backend acts as the source of truth for user data.

The frontend communicates with the backend through REST APIs.

---

## Data & Security

GlowGuide is designed as a multi-user application.

Each registered user receives a separate account and their application data is associated with their user ID.

The application uses:

* Password hashing with bcrypt
* JWT authentication
* HTTP-only authentication cookies
* Protected API endpoints
* User-specific database queries
* Environment variables for database credentials and secrets
* `.env` excluded from version control

Sensitive configuration such as database passwords and JWT secrets is not stored in the GitHub repository.

---

## Database

GlowGuide uses MySQL for persistent storage.

The database contains the following major tables:

```text
users
profiles
routines
routine_steps
routine_completions
beauty_products
journal_entries
beauty_events
event_tasks
look_plans
user_settings
feedback
```

The database schema is available in:

```text
database/schema.sql
```

---

## Project Structure

```text
GlowGuide/
│
├── index.html
├── login.html
├── register.html
├── profile.html
├── dashboard.html
├── routine.html
├── planner.html
├── vault.html
├── journal.html
├── looks.html
├── insights.html
├── settings.html
│
├── css/
│   ├── style.css
│   └── responsive.css
│
├── js/
│   ├── api.js
│   ├── storage.js
│   ├── app.js
│   ├── dashboard.js
│   ├── routine.js
│   ├── planner.js
│   ├── vault.js
│   ├── journal.js
│   ├── looks.js
│   ├── insights.js
│   ├── settings.js
│   └── demo.js
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   │
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   └── .gitignore
│
├── database/
│   └── schema.sql
│
└── README.md
```

---

## API Structure

The backend provides REST API endpoints for the major application features.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Profile

```text
GET /api/profile
PUT /api/profile
```

### Routines

```text
GET    /api/routines
POST   /api/routines
PUT    /api/routines/:id
DELETE /api/routines/:id
```

### Analytics

```text
GET /api/analytics
```

### Products

```text
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Journal

```text
GET    /api/journal
POST   /api/journal
PUT    /api/journal/:id
DELETE /api/journal/:id
```

### Events

```text
GET    /api/events
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id
```

### Look Plans

```text
GET    /api/looks
POST   /api/looks
PUT    /api/looks/:id
DELETE /api/looks/:id
```

### Settings

```text
GET /api/settings
PUT /api/settings
```

---

## How to Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/saiprasanna2005/GlowGuide.git
cd GlowGuide
```

### 2. Set up the MySQL database

Open MySQL Workbench and run:

```sql
SOURCE database/schema.sql;
```

Or execute the SQL commands from:

```text
database/schema.sql
```

### 3. Configure the backend

Go to the backend folder:

```bash
cd backend
```

Create a `.env` file based on:

```text
.env.example
```

Configure the following variables:

```text
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=
NODE_ENV=development
```

### 4. Install backend dependencies

```bash
npm install
```

### 5. Start the backend

```bash
npm start
```

The API will run on:

```text
http://localhost:4000
```

### 6. Start the frontend

Serve the project using a local static server.

For example:

```bash
npx serve .
```

Then open the URL provided by the server.

---

## Environment Variables

The application uses environment variables for configuration.

Example:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=glowguide

JWT_SECRET=your_secure_secret
JWT_EXPIRES_IN=7d

PORT=4000
CORS_ORIGIN=http://localhost:5500
NODE_ENV=development
```

The real `.env` file should never be committed to GitHub.

---

## LocalStorage Usage

GlowGuide previously used browser LocalStorage as its primary persistence layer.

The application has now been migrated to a backend-driven architecture.

User data such as:

* Profile
* Routines
* Routine completion history
* Beauty products
* Journal entries
* Events
* Event tasks
* Saved looks
* User settings
* Analytics

is now managed through the backend and MySQL database.

Theme preference may remain locally stored because it is a UI preference rather than application data.

---

## Multi-User Architecture

Unlike the original browser-only version, the full-stack GlowGuide application supports multiple user accounts.

Example:

```text
User A
 ├── Profile A
 ├── Routines A
 ├── Journal A
 └── Products A

User B
 ├── Profile B
 ├── Routines B
 ├── Journal B
 └── Products B
```

Users cannot access another user's application data through the normal API because backend queries are associated with the authenticated user.

---

## Screenshots

Screenshots can be added here to demonstrate the main application pages:

* Landing Page
* Registration / Login
* Beauty Profile
* Dashboard
* My Routine
* Glam Planner
* Beauty Vault
* Beauty Journal
* Look Planner
* Insights
* Settings

---

## Future Improvements

Possible future improvements include:

* Production deployment
* Email verification
* Password reset
* Account deletion
* Push notifications
* PWA support
* Advanced analytics
* Cloud image storage
* Social sharing of saved looks
* Additional personalization
* Mobile application version

---

## Project Development Journey

GlowGuide started as a browser-based beauty planning application using HTML, CSS, JavaScript, and LocalStorage.

The project was later redesigned into a full-stack application.

### Initial Architecture

```text
HTML + CSS + JavaScript
        │
        ▼
Browser LocalStorage
```

### Current Architecture

```text
HTML + CSS + JavaScript
        │
        ▼
REST API
        │
        ▼
Node.js + Express.js
        │
        ▼
MySQL
```

This migration introduced:

* User authentication
* Persistent database storage
* REST API architecture
* Multi-user support
* Protected backend routes
* Server-side analytics
* Better separation between frontend and backend
* Scalable data management

---

## Author

**Gatati Sai Prasanna**

B.Tech Computer Science Engineering (Information Technology)

GitHub: [@saiprasanna2005](https://github.com/saiprasanna2005)

---

## License

This project is developed as a personal portfolio project for learning, demonstration, and professional development.
