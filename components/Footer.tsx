"use client";

import Link from "next/link";
// import { FacebookIcon, InstagramIcon, TwitterIcon } from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">

      {/* TOP SECTION */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">

        {/* BRAND */}
        <div>
          <h2 className="text-xl font-bold text-white">ShopSphere</h2>
          <p className="text-sm mt-3 text-gray-400">
            Discover trending products at the best prices. Fast delivery &
            trusted shopping experience.
          </p>
        </div>

        {/* COMPANY */}
        <div>
          <h3 className="font-semibold text-white mb-3">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="#">About Us</Link></li>
            <li><Link href="#">Careers</Link></li>
            <li><Link href="#">Blog</Link></li>
          </ul>
        </div>

        {/* SUPPORT */}
        <div>
          <h3 className="font-semibold text-white mb-3">Support</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="#">Help Center</Link></li>
            <li><Link href="#">Returns</Link></li>
            <li><Link href="#">Shipping</Link></li>
          </ul>
        </div>

        {/* CONTACT */}
        <div>
          <h3 className="font-semibold text-white mb-3">Contact</h3>
          <p className="text-sm text-gray-400">support@shopsphere.com</p>

          {/* SOCIAL */}
          <div className="flex gap-4 mt-4">
            <FaFacebook  className="w-5 h-5 hover:text-white cursor-pointer" />
            <FaInstagram  className="w-5 h-5 hover:text-white cursor-pointer" />
            <FaTwitter  className="w-5 h-5 hover:text-white cursor-pointer" />
          </div>
        </div>

      </div>

      {/* BOTTOM */}
      <div className="border-t border-gray-800 text-center text-sm py-4 text-gray-500">
        © {new Date().getFullYear()} ShopSphere. All rights reserved.
      </div>

    </footer>
  );
}