import { useId } from 'react';
import './AstraHeroMark.css';

const APERTURE_CLIP_CLOSED = 'M.5 0L.58.36L1 .5L.58.64L.5 1L.42.64L0 .5L.42.36ZM.5.5L.5.5L.5.5L.5.5L.5.5L.5.5L.5.5L.5.5Z';
const APERTURE_CLIP_OPEN = 'M.5 0L.58.36L1 .5L.58.64L.5 1L.42.64L0 .5L.42.36ZM.5-.06L.5896.3432L1.06.5L.5896.6568L.5 1.06L.4104.6568L-.06.5L.4104.3432Z';

const AstraHeroMark = ({ variant = 'static' }) => {
  const apertureId = useId().replace(/:/g, '');
  const apertureClipId = `astra-home-aperture-clip-${apertureId}`;

  if (variant !== 'animated') {
    return (
      <div className="astra-hero-mark astra-hero-mark--static" aria-hidden="true">
        <span className="astra-hero-mark__glyph astra-hero-mark__glyph--static" />
      </div>
    );
  }

  return (
    <div className="astra-hero-mark astra-hero-mark--animated" aria-hidden="true">
      <svg className="astra-hero-mark__aperture-defs" focusable="false">
        <defs>
          <clipPath id={apertureClipId} clipPathUnits="objectBoundingBox">
            <path d={APERTURE_CLIP_CLOSED} clipRule="evenodd" fillRule="evenodd">
              <animate
                attributeName="d"
                begin="800ms"
                calcMode="spline"
                dur="620ms"
                fill="freeze"
                keySplines="0.16 1 0.3 1"
                keyTimes="0;1"
                values={`${APERTURE_CLIP_CLOSED};${APERTURE_CLIP_OPEN}`}
              />
            </path>
          </clipPath>
        </defs>
      </svg>
      <span className="astra-hero-mark__glyph astra-hero-mark__glyph--animated" />
      <span className="astra-hero-mark__aperture-shell">
        <span
          className="astra-hero-mark__aperture-material"
          style={{
            clipPath: `url(#${apertureClipId})`,
            WebkitClipPath: `url(#${apertureClipId})`
          }}
        />
      </span>
    </div>
  );
};

export default AstraHeroMark;
