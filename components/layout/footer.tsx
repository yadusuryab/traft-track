import React from "react";
import Link from "next/link";
import {
  PhoneCall,
} from "lucide-react";
import { Button } from "../ui/button";
import Image from "next/image";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background mt-10 w-full">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-t pt-5 md:px-28 px-5 gap-6">
        {/* Brand and Navigation Links */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 flex-wrap w-full md:w-auto justify-center md:justify-start">
          <div className="flex items-center justify-center">
          <Image
                src="/wordmark.png"
                alt="Company Logo"
                width={100}
                height={40}
                className="h-4 w-auto"
                priority
              />
             
          </div>
       
        </div>

        {/* Contact Section */}
       
      </div>

      {/* Bottom Section */}
      <div className="flex justify-center md:justify-between py-5 px-5 md:px-28  text-muted-foreground text-sm">
        <p>&copy; {currentYear}, {process.env.NEXT_PUBLIC_APP_NAME}.</p>
      </div>
    </footer>
  );
}

export default Footer;
