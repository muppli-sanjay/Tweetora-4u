// Turns "hello #world" into ["hello ", <span class="hashtag">#world</span>].
// With { links: true } web addresses also become clickable links.
const HASHTAG = /(#[\p{L}\p{N}_]+)/gu;
const HASHTAG_OR_URL = /(#[\p{L}\p{N}_]+|https?:\/\/[^\s<]+)/gu;

export const renderHashtags = (text, { links = false } = {}) =>
  String(text || '').split(links ? HASHTAG_OR_URL : HASHTAG).map((part, i) => {
    if (part.length > 1 && part.startsWith('#')) return <span key={i} className="hashtag">{part}</span>;
    if (links && /^https?:\/\//.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-link">{part}</a>;
    }
    return part;
  });

// Returns the video id of the first YouTube link in the text (watch, youtu.be, shorts, embed), or null
const YT = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i;
export const getYouTubeId = (text) => {
  const m = String(text || '').match(YT);
  return m ? m[1] : null;
};
