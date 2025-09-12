import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  console.log('ProtectedRoute check, currentUser:', currentUser);

  if (currentUser === null) {
    console.log('No currentUser, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;