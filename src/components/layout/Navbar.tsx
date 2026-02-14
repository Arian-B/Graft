'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent hover:from-orange-400 hover:to-orange-500 transition-all">
              Graft
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/dashboard"
                className="text-zinc-300 hover:text-orange-500 hover:bg-zinc-800 px-3 py-2 rounded-md text-sm font-medium transition-all"
              >
                Dashboard
              </Link>
              <Link
                href="/create"
                className="text-zinc-300 hover:text-orange-500 hover:bg-zinc-800 px-3 py-2 rounded-md text-sm font-medium transition-all"
              >
                Create
              </Link>
            </div>
          </div>

          {/* Desktop Login Button */}
          <div className="hidden md:block">
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40">
              Login
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-orange-500 hover:bg-zinc-800 transition-all"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-zinc-800">
            <Link
              href="/dashboard"
              className="text-zinc-300 hover:text-orange-500 hover:bg-zinc-800 block px-3 py-2 rounded-md text-base font-medium transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/create"
              className="text-zinc-300 hover:text-orange-500 hover:bg-zinc-800 block px-3 py-2 rounded-md text-base font-medium transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              Create
            </Link>
            <button className="w-full text-left bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md text-base font-medium transition-all shadow-lg shadow-orange-500/20">
              Login
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
