import { useEffect, useState } from 'react';

const getInitialState = (breakpoint) => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.innerWidth <= breakpoint;
};

export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => getInitialState(breakpoint));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}
