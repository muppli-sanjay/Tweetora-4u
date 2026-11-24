<p align="center">
  <img src="client/src/assets/logo.png" alt="Tweetora-4u" height="140" />
</p>

<h1 align="center">Tweetora-4u</h1>
<p align="center"><em>Your Thoughts. Your Connections.</em></p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" />
  <img alt="SCSS" src="https://img.shields.io/badge/Styles-SCSS-CC6699?logo=sass&logoColor=white" />
</p>

Tweetora-4u is a full-stack social media web app built with the MERN stack. Users can share posts with photos, video and audio, follow friends, chat, and get notified about likes, comments and friend requests. It has a responsive layout for phones and a light/dark theme.

## Screenshots

### Getting in

| | |
| :---: | :---: |
| **Log in**<br><img src="docs/screenshots/login.png" alt="Log in" /> | **Create an account**<br><img src="docs/screenshots/register.png" alt="Create an account" /> |

### Feed and posts

| | |
| :---: | :---: |
| **Home feed**<br><img src="docs/screenshots/home-feed.png" alt="Home feed" /> | **Create a post with hashtags and tagged friends**<br><img src="docs/screenshots/create-post.png" alt="Create a post with hashtags and tagged friends" /> |
| **Post menu: bookmark, copy link, delete (your own posts)**<br><img src="docs/screenshots/post-menu.png" alt="Post menu: bookmark, copy link, delete (your own posts)" /> | **Comments**<br><img src="docs/screenshots/comments.jpeg" alt="Comments" /> |
| **YouTube links play inside the post**<br><img src="docs/screenshots/youtube-embed.png" alt="YouTube links play inside the post" /> | **Audio posts**<br><img src="docs/screenshots/audio-post.jpeg" alt="Audio posts" /> |
| **Video posts**<br><img src="docs/screenshots/video-post.png" alt="Video posts" /> | **Single post page**<br><img src="docs/screenshots/audio-post.jpeg" alt="Single post page" /> |

### Your activity

| | |
| :---: | :---: |
| **Liked posts**<br><img src="docs/screenshots/liked-posts.png" alt="Liked posts" /> | **Posts you commented on**<br><img src="docs/screenshots/commented-posts.png" alt="Posts you commented on" /> |
| **Bookmarks**<br><img src="docs/screenshots/bookmarks.png" alt="Bookmarks" /> | **Photos**<br><img src="docs/screenshots/photos.png" alt="Photos" /> |
| **Videos**<br><img src="docs/screenshots/video-post.png" alt="Videos" /> |  |

### Profile

| | |
| :---: | :---: |
| **Profile**<br><img src="docs/screenshots/profile.png" alt="Profile" /> | **Tagged posts**<br><img src="docs/screenshots/profile-tagged.png" alt="Tagged posts" /> |
| **Friends tab**<br><img src="docs/screenshots/profile-friends.png" alt="Friends tab" /> | **Edit profile**<br><img src="docs/screenshots/edit-profile.png" alt="Edit profile" /> |

### Friends, chat and notifications

| | |
| :---: | :---: |
| **Friends**<br><img src="docs/screenshots/friends.png" alt="Friends" /> | **Add friends**<br><img src="docs/screenshots/add-friends.png" alt="Add friends" /> |
| **Search**<br><img src="docs/screenshots/search.png" alt="Search" /> | **Messages**<br><img src="docs/screenshots/messages.png" alt="Messages" /> |
| **Notifications**<br><img src="docs/screenshots/notifications.png" alt="Notifications" /> | **About page**<br><img src="docs/screenshots/about.png" alt="About page" /> |

### Dark mode and mobile

| | |
| :---: | :---: |
| **Dark mode**<br><img src="docs/screenshots/dark-home.png" alt="Dark mode" /> | **Dark mode notifications**<br><img src="docs/screenshots/dark-notifications.png" alt="Dark mode notifications" /> |

### On a phone

The side menu becomes a scrollable bottom tab bar.

<p>
  <img src="docs/screenshots/mobile-home.jpeg" width="190" alt="mobile-home" />
  <img src="docs/screenshots/mobile-profile.jpeg" width="190" alt="mobile-profile" />
  <img src="docs/screenshots/mobile-message.jpeg" width="190" alt="mobile-messages" />
  <img src="docs/screenshots/mobile-bookmarks.jpeg" width="190" alt="mobile-bookmarks" />
</p>

## Features

- **Accounts:** register and log in with JWT authentication, hashed passwords, and clear validation messages
- **Posts:** create posts with text, image, video or audio, location and tagged friends; delete your own posts
- **Interactions:** like, comment, share and bookmark posts; `#hashtags` and links are highlighted, and YouTube links play inside the post
- **Your activity:** dedicated Liked, Comments and Bookmarks pages
- **Friends:** search for people, send, accept or reject friend requests, and manage your friends list
- **Notifications:** alerts for likes, comments, friend requests and accepted requests, with an unread badge
- **Messaging:** one-to-one chat between friends
- **Profile:** edit your name, username, bio, date of birth and photo; see your posts, tagged posts and friends
- **UI:** light and dark mode, responsive layout with a bottom tab bar on phones

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios, SCSS, Material UI icons |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth and uploads | JSON Web Tokens, bcrypt, Multer |

## Project structure

```
Tweetora-4u/
├── client/                  React + Vite frontend (http://localhost:3000)
│   ├── public/
│   └── src/
│       ├── api/             shared Axios instance and error helpers
│       ├── assets/          logos and icons
│       ├── components/      navbar, leftBar, post, posts, share, hashtag, notifications,
│       │                    messages, friends, addFrnds, photos, videos, groups
│       ├── context/         authContext, darkModeContext
│       ├── pages/           login, register, home, profile, post, about, collection
│       ├── utils/           hashtag and YouTube link helpers
│       ├── App.jsx          routes and layout
│       └── main.jsx
└── server/                  Express API (http://localhost:5000)
    ├── middleware/          auth.js (JWT verification)
    ├── models/              User, Post, Comment, Notification, Message, RefreshToken
    ├── routes/              auth, users, posts, notifications, messages, search, refresh
    ├── utils/               errors.js (friendly error messages)
    ├── Uploads/             post media (created automatically, not committed)
    ├── profile_upload/      profile pictures (created automatically, not committed)
    └── index.js
```

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org) 18 or newer, and [MongoDB](https://www.mongodb.com/try/download/community) running locally (or a free MongoDB Atlas connection string).

**1. Clone the repository**

```bash
git clone https://github.com/Mupplisanjay/Tweetora-4u.git
cd Tweetora-4u
```

**2. Start the server**

```bash
cd server
npm install
cp .env.example .env     # on Windows: copy .env.example .env
# open .env and set JWT_SECRET (and MONGO_URI if you are not using local MongoDB)
npm start
```

**3. Start the client** (in a second terminal)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:3000, create an account and start posting.

### Environment variables

| File | Variable | Purpose |
| --- | --- | --- |
| `server/.env` | `JWT_SECRET` | secret used to sign login tokens |
| `server/.env` | `MONGO_URI` | MongoDB connection string |
| `server/.env` | `PORT` | API port (default 5000) |
| `server/.env` | `CLIENT_URL` | allowed frontend origin for CORS |
| `client/.env` | `VITE_SERVER_URL` | API address if it is not `http://localhost:5000` |