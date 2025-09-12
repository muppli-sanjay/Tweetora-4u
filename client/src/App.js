import Login from './pages/login/Login';
import Register from './pages/register/Register';
import AddFrnds from './components/addFrnds/AddFrnds';
import Photos from './components/photos/Photos';
import Videos from './components/videos/Videos';
import Messages from './components/messages/Messages';
import Friends from './components/friends/Friends';
import Groups from './components/groups/Groups';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
} from 'react-router-dom';
import Navbar from './components/navbar/Navbar';
import LeftBar from './components/leftBar/LeftBar';
import RightBar from './components/rightBar/RightBar';
import Home from './pages/home/Home';
import Profile from './pages/profile/Profile';
import './style.scss';
import { useContext } from 'react';
import { DarkModeContext } from './context/darkModeContext';
import { AuthContext } from './context/authContext';
import { AuthContextProvider } from './context/authContext';
import { DarkModeContextProvider } from './context/darkModeContext';
import Notifications from './components/notifications/Notifications';

function App() {
  const { darkMode } = useContext(DarkModeContext);

  const Layout = () => {
    return (
      <div className={`theme-${darkMode ? 'dark' : 'light'}`}>
        <Navbar />
        <div style={{ display: 'flex' }}>
          <LeftBar />
          <div style={{ flex: 6 }}>
            <Outlet />
          </div>
        </div>
      </div>
    );
  };

  const ProtectedRoute = ({ children }) => {
    const { currentUser, loading: authLoading, accessToken } = useContext(AuthContext);
    console.log('ProtectedRoute: authLoading=', authLoading);
    console.log('ProtectedRoute: accessToken=', accessToken ? 'Present' : 'Missing');
    console.log('ProtectedRoute: currentUser=', currentUser ? {
      _id: currentUser._id,
      username: currentUser.username,
      name: currentUser.name,
    } : 'null');

    if (authLoading) {
      console.log('ProtectedRoute: Waiting for auth initialization');
      return <div style={{ padding: '20px', color: '#000' }}>Loading authentication...</div>;
    }

    if (!currentUser || !currentUser._id || !accessToken) {
      console.log('ProtectedRoute: Missing currentUser, _id, or accessToken, redirecting to /login');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('user');
      return <Navigate to="/login" replace />;
    }

    console.log('ProtectedRoute: Rendering children for user:', currentUser._id);
    return children;
  };

  const ErrorPage = () => {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#000' }}>
        <h1>404 Not Found</h1>
        <p>Sorry, the page you are looking for does not exist.</p>
        <a href="/" style={{ color: '#007bff' }}>Go to Home</a>
      </div>
    );
  };

  const router = createBrowserRouter([
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        {
          path: '/',
          element: <Home />,
        },
        {
          path: '/profile/:id',
          element: <Profile />,
        },
        {
          path: '/add-friends',
          element: <AddFrnds />,
        },
        {
          path: '/notifications',
          element: <Notifications />,
        },
        {
          path: '/photos',
          element: <Photos />,
        },
        {
          path: '/videos',
          element: <Videos />,
        },
        {
          path: '/messages',
          element: <Messages />,
        },
        {
          path: '/messages/:userId',
          element: <Messages />,
        },
        {
          path: '/friends',
          element: <Friends />,
        },
        {
          path: '/groups',
          element: <Groups />,
        },
      ],
    },
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/register',
      element: <Register />,
    },
    {
      path: '*',
      element: <ErrorPage />,
    },
  ]);

  return (
    <AuthContextProvider>
      <DarkModeContextProvider>
        <div className={`theme-${darkMode ? 'dark' : 'light'}`}>
          <RouterProvider router={router} />
        </div>
      </DarkModeContextProvider>
    </AuthContextProvider>
  );
}

export default App;