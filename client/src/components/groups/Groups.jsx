import { useContext } from 'react';
import { AuthContext } from '../../context/authContext';
import { DarkModeContext } from '../../context/darkModeContext';
import './groups.scss';

const Groups = () => {
  const { currentUser } = useContext(AuthContext);
  const { darkMode } = useContext(DarkModeContext);

  if (!currentUser) {
    return null;
  }

  // Mock groups data (replace with API)
  const groups = [
    { id: 1, name: "Photography Club", icon: "https://images.pexels.com/photos/3184297/pexels-photo-3184297.jpeg" },
    { id: 2, name: "Tech Enthusiasts", icon: "https://images.pexels.com/photos/3184297/pexels-photo-3184297.jpeg" },
  ];

  return (
    <div className={`groups ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <h2>{currentUser.name}'s Groups</h2>
      <div className="groups-list">
        {groups.length > 0 ? (
          groups.map(group => (
            <div key={group.id} className="group-card">
              <img src={group.icon} alt={group.name} className="icon" />
              <span>{group.name}</span>
            </div>
          ))
        ) : (
          <p>No groups found.</p>
        )}
      </div>
    </div>
  );
};

export default Groups;