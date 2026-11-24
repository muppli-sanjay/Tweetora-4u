import { SERVER_URL } from '../../api/axios';
import { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import { NavLink } from "react-router-dom";
import Friends from "../../assets/1.png";
import Gallery from "../../assets/8.png";
import Videos from "../../assets/9.png";
import Messages from "../../assets/10.png";
import Addfrnds from "../../assets/add_frnds.png";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import "./leftBar.scss";

const LeftBar = () => {
  const { currentUser } = useContext(AuthContext);
  const avatar = currentUser?.profilePicture
    ? (currentUser.profilePicture.startsWith('http') ? currentUser.profilePicture : `${SERVER_URL}${currentUser.profilePicture}`)
    : null;

  return (
    <nav className="leftBar" aria-label="Main menu">
      <div className="menu">
        <NavLink to="/" end className="item home-mobile">
          <HomeOutlinedIcon />
          <span>Home</span>
        </NavLink>
        {currentUser && (
          <NavLink to={`/profile/${currentUser._id}`} className="item">
            {avatar ? <img className="round" src={avatar} alt="" /> : <AccountCircleOutlinedIcon />}
            <span>My Profile</span>
          </NavLink>
        )}
        <NavLink to="/friends" className="item">
          <img src={Friends} alt="" />
          <span>Friends</span>
        </NavLink>
        <NavLink to="/add-friends" className="item">
          <img src={Addfrnds} alt="" />
          <span>Add Friends</span>
        </NavLink>
        <NavLink to="/liked" className="item liked">
          <FavoriteBorderIcon />
          <span>Liked</span>
        </NavLink>
        <NavLink to="/commented" className="item commented">
          <ChatBubbleOutlineIcon />
          <span>Comments</span>
        </NavLink>
        <NavLink to="/bookmarks" className="item bookmarks">
          <BookmarkBorderIcon />
          <span>Bookmarks</span>
        </NavLink>
        <NavLink to="/photos" className="item">
          <img src={Gallery} alt="" />
          <span>Photos</span>
        </NavLink>
        <NavLink to="/videos" className="item">
          <img src={Videos} alt="" />
          <span>Videos</span>
        </NavLink>
        <NavLink to="/messages" className="item">
          <img src={Messages} alt="" />
          <span>Messages</span>
        </NavLink>
        <NavLink to="/about" className="item about-link">
          <InfoOutlinedIcon />
          <span>About</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default LeftBar;