import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import { Link } from "react-router-dom";
import Friends from "../../assets/1.png";
import Gallery from "../../assets/8.png";
import Videos from "../../assets/9.png";
import Messages from "../../assets/10.png";
import Addfrnds from "../../assets/add_frnds.png";
import "./leftBar.scss";

const LeftBar = () => {
  const { currentUser } = useContext(AuthContext);

  console.log('LeftBar: currentUser=', currentUser ? {
    _id: currentUser._id,
    username: currentUser.username,
    name: currentUser.name,
  } : 'null');

  return (
    <div className="leftBar">
      <div className="container">
        <hr />
        <div className="menu">
          <span>Your shortcuts</span>
          <div className="menu">
          <Link to="/friends" className="item" style={{ textDecoration: 'none' }}>
            <img src={Friends} alt="Friends icon" />
            <span>Friends</span>
          </Link>
        </div>
          <Link to="/add-friends" className="item" style={{ textDecoration: 'none' }}>
            <img src={Addfrnds} alt="Add Friends icon" />
            <span>Add Friends</span>
          </Link>
          <Link to="/photos" className="item" style={{ textDecoration: 'none' }}>
            <img src={Gallery} alt="Photos icon" />
            <span>Photos</span>
          </Link>
          <Link to="/videos" className="item" style={{ textDecoration: 'none' }}>
            <img src={Videos} alt="Videos icon" />
            <span>Videos</span>
          </Link>
          <Link to="/messages" className="item" style={{ textDecoration: 'none' }}>
            <img src={Messages} alt="Messages icon" />
            <span>Messages</span>
          </Link>
        </div>
        <hr />
      </div>
    </div>
  );
};

export default LeftBar;