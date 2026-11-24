import { useContext } from 'react';
import { AuthContext } from '../../context/authContext';
import Posts from '../../components/posts/Posts';
import Share from '../../components/share/Share';
import './home.scss';

const Home = () => {
  const { currentUser } = useContext(AuthContext);

  if (!currentUser) {
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