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
    <div className={`fixed right-8 bottom-8 hidden ${show ? 'md:flex' : 'md:hidden'}`}>
      <button
        onClick={handleScrollTop}
        aria-label="Scroll to top"
        className="bg-yellow-medium text-beige-dark hover:bg-yellow-light rounded-full p-2 transition-all"
      >
        <ArrowUpIcon size={24} />
      </button>
    </div>
  );
};

export default ButtonScrollTop;
