import { useLayoutEffect, useRef, useState } from 'react';
import { renderHashtags } from '../../utils/hashtags';
import './hashtagInput.scss';

// A normal text field that shows #hashtags in blue while the user types.
// A transparent field sits on top of a mirror that renders the same text with colours.
// Pass multiline to get an auto-growing textarea (text wraps onto new lines).
const COPY = ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];

const HashtagInput = ({ className = '', value, onChange, multiline = false, ...rest }) => {
  const wrapRef = useRef(null);
  const fieldRef = useRef(null);
  const mirrorRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    const mirror = mirrorRef.current;
    if (!field || !mirror) return;
    // keep the mirror's typography identical to the real field
    const cs = window.getComputedStyle(field);
    COPY.forEach((k) => { mirror.style[k] = cs[k]; });
    // the field's own text is transparent, so give the caret the visible text colour
    field.style.caretColor = window.getComputedStyle(wrapRef.current).color;
    // grow with the content
    if (multiline) {
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight}px`;
    }
  });

  const sync = () => {
    if (!multiline && fieldRef.current) setScrollLeft(fieldRef.current.scrollLeft);
  };

  const Field = multiline ? 'textarea' : 'input';

  return (
    <span ref={wrapRef} className={`hashtag-input ${multiline ? 'multi' : ''} ${className}`}>
      <span className="mirror" ref={mirrorRef} aria-hidden="true">
        <span style={multiline ? undefined : { transform: `translateX(${-scrollLeft}px)` }}>
          {renderHashtags(value)}
        </span>
      </span>
      <Field
        ref={fieldRef}
        value={value}
        rows={multiline ? 1 : undefined}
        onChange={(e) => { onChange(e); sync(); }}
        onScroll={sync}
        onKeyUp={sync}
        onClick={sync}
        onSelect={sync}
        {...rest}
      />
    </span>
  );
};

export default HashtagInput;