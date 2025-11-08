// components/Header.tsx
import React from 'react';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import Link from 'next/link';

const Header = ({ 
  track = "Current Track", 
  className = "" 
}) => {
  return (
    <header className={`w-full bg-white  border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16">
          {/* Logo and Track Section */}
          <div className="flex items-center space-x-2">
            {/* Logo */}
            <div className="flex-shrink-0">
             <Link  href="/"> <Image
                src="/wordmark.png"
                alt="Company Logo"
                width={100}
                height={40}
                className="h-4 w-auto"
                priority
              /></Link>
             
            </div>
            <Badge ><span className='font-bold italic'>TRACK</span></Badge>
            {/* Track Subtitle */}
         
          </div>

          {/* Optional: Add navigation or other header elements here */}
         
        </div>
        
        {/* Mobile track display */}
       
      </div>
    </header>
  );
};

export default Header;