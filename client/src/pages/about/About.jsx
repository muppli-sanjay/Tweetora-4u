import InstagramIcon from '@mui/icons-material/Instagram';
import EmailIcon from '@mui/icons-material/Email';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import logo from '../../assets/logo.png';
import './about.scss';

// ---- Edit this block to change everything shown on the page ----
const appInfo = {
  name: 'Tweetora-4u',
  description:
    'Tweetora-4u is a social media web app where you share posts, photos and videos, follow friends, chat in real time and stay on top of what matters through notifications.',
  purpose:
    'Built to give people a clean, fast and friendly place to express themselves and stay connected.',
};

const nameMeaning = [
  { part: 'Tweet', text: 'Short, expressive posts, the heart of the app: say it, share it.' },
  { part: 'ora', text: 'A voice and an aura: every user brings their own presence to the feed.' },
  { part: '4u', text: '"For you": a space made around your friends, your posts and your feed.' },
];

const authors = [
  { name: 'Mupplisanjay P', role: 'Full-stack developer', bio: 'Built the Node.js/Express REST API and MongoDB database architecture for Tweetora-4u, handling JWT authentication, file uploads, and core backend logic for posts, interactions, friend requests, and notifications.' },
  { name: 'Nithish M', role: 'Backend developer', bio: 'Built the React frontend for Tweetora-4u, connecting the home feed, post interactions, messaging, friend requests, notifications, and user profiles to the backend API using React Context and Axios.' },
  { name: 'Santhosh G', role: 'UI / UX and testing', bio: 'Designed the brand identity, responsive SCSS interface, and Light/Dark themes for Tweetora-4u, while conducting end-to-end QA testing across mobile and desktop and preparing the project documentation and demo.' },
];

const techStack = [
  'React 18 with Vite for a fast single-page frontend',
  'React Router for page navigation',
  'SCSS with light and dark themes',
  'Node.js and Express REST API',
  'MongoDB with Mongoose',
  'JWT authentication with bcrypt password hashing',
  'Multer for image and video uploads',
];

const features = [
  'Secure registration and login with friendly error messages',
  'Create posts with photos, videos, location and tagged friends',
  'Like, comment, share and bookmark posts',
  'Liked, Comments and Bookmarks pages to find your activity again',
  'Friend requests with accept / reject and a friends list',
  'Real-time style notifications for likes, comments and friend requests',
  'Direct messaging between friends',
  'Editable profile with bio, date of birth and photo',
  'Search for people and posts',
  'Light and dark mode, responsive on phones',
];

const contacts = [
  { name: 'Mupplisanjay P', instagram: 'https://www.instagram.com/mupplisanjay?bqrl=aGtyamVlcnhhYXI1', email: 'mupplisanjay03@gmail.com', linkedin: 'https://www.linkedin.com/in/mupplisanjay-p03' },
  { name: 'Nithish M', instagram: 'https://www.instagram.com/itz_nithish____?fqnt=MTdzeWJyeDg1MW4wNg==', email: 'nithishm47@gmail.com', linkedin: 'https://www.linkedin.com/in/nithish-m-922399262/' },
  { name: 'Santhosh G', instagram: 'https://www.instagram.com/_shady_sxndy?cnvx=MWNxYzVzNGl5NHRpcw==', email: 'santhoshgopinath10@gmail.com', linkedin: 'https://www.linkedin.com/in/santhosh-gopinath-14817335b/' },
];
// -----------------------------------------------------------------

const About = () => (
  <div className="about-page">
    <section className="hero">
      <img src={logo} alt="" className="hero-logo" />
      <h1>About {appInfo.name}</h1>
      <p className="lead">{appInfo.description}</p>
      <p className="purpose">{appInfo.purpose}</p>
    </section>

    <section>
      <h2>What the name means</h2>
      <div className="grid three">
        {nameMeaning.map((n) => (
          <div className="card" key={n.part}>
            <h3 className="accent">{n.part}</h3>
            <p>{n.text}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h2>Who built it</h2>
      <div className="grid three">
        {authors.map((a) => (
          <div className="card" key={a.name}>
            <h3>{a.name}</h3>
            <span className="role">{a.role}</span>
            <p>{a.bio}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h2>What it is built with</h2>
      <ul className="list">
        {techStack.map((t) => (
          <li key={t}><CheckCircleIcon className="ok" />{t}</li>
        ))}
      </ul>
    </section>

    <section>
      <h2>Features</h2>
      <ul className="list">
        {features.map((f) => (
          <li key={f}><StarIcon className="star" />{f}</li>
        ))}
      </ul>
    </section>

    <section>
      <h2>Contact</h2>
      <div className="grid three">
        {contacts.map((c) => (
          <div className="card" key={c.name}>
            <h3>{c.name}</h3>
            <ul className="links">
              <li><InstagramIcon className="ig" /><a href={c.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><EmailIcon className="mail" /><a href={`mailto:${c.email}`}>{c.email}</a></li>
              <li><LinkedInIcon className="in" /><a href={c.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
            </ul>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default About;