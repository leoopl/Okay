'use client';

import { ArrowUpIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

const ButtonScrollTop = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 100) setShow(true);
      else setShow(false);
    };
    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`fixed bottom-8 right-8 hidden ${show ? 'md:flex' : 'md:hidden'}`}>
      <button
        onClick={handleScrollTop}
        aria-label="Scroll to top"
        className="rounded-full bg-yellowMedium p-2 text-beigeDark transition-all hover:bg-yellowLight"
      >
        <ArrowUpIcon size={24} />
      </button>
    </div>
  );
};

export default ButtonScrollTop;
