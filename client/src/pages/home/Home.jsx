import { useContext } from 'react';
import { AuthContext } from '../../context/authContext';
import Posts from '../../components/posts/Posts';
import Share from '../../components/share/Share';
import Stories from '../../components/stories/Stories';
import './home.scss';

const Home = () => {
  const { currentUser } = useContext(AuthContext);

  if (!currentUser) {
    console.log('No currentUser in Home, redirecting to login');
    return null;
  }

  return (
    <div className="home">
      <Share />
      <Posts userId={currentUser.id} />
    </div>
  );
};

export default Home;