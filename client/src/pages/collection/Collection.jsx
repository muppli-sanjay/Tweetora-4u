import Posts from '../../components/posts/Posts';
import './collection.scss';

const PAGES = {
  liked: {
    title: 'Liked posts',
    sub: 'Everything you have liked, newest first.',
    endpoint: '/posts/liked',
    empty: 'You have not liked any posts yet.',
  },
  commented: {
    title: 'Commented posts',
    sub: 'Posts where you joined the conversation.',
    endpoint: '/posts/commented',
    empty: 'You have not commented on any posts yet.',
  },
  bookmarks: {
    title: 'Bookmarks',
    sub: 'Posts you saved. Use the ••• menu on a post to add or remove one.',
    endpoint: '/posts/bookmarked',
    empty: 'No bookmarks yet. Open the ••• menu on any post and choose Add bookmark.',
  },
};

const Collection = ({ type }) => {
  const cfg = PAGES[type];
  return (
    <div className="collection">
      <header>
        <h2>{cfg.title}</h2>
        <p>{cfg.sub}</p>
      </header>
      <Posts endpoint={cfg.endpoint} emptyText={cfg.empty} removeOnUnbookmark={type === 'bookmarks'} />
    </div>
  );
};

export default Collection;
