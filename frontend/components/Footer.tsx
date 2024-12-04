import Link from 'next/link';
import Image from 'next/image';
import githubicon from '../public/github.svg';

const Footer: React.FC = () => {
  return (
    <footer id="footer">
      <hr className="mx-auto w-11/12" />
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-col items-center justify-center gap-x-5 gap-y-1 sm:flex-row">
          <div className="text-sm text-black">
            © 2024 Okay? All rights reserved to Okay project.
          </div>
          <div className="mb-4 flex space-x-4 sm:mb-0">
            <Link href="https://github.com/leoopl/Okay">
              <Image src={githubicon} alt="githubicon" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
