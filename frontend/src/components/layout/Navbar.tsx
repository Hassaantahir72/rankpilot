'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'nav-glass' : 'bg-transparent'}`}>
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
                  R
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#08080f] ping"></div>
              </div>
              <span className="font-bold text-lg tracking-tight">Rank<span className="gradient-text">Pilot</span></span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <Link key={link.href} href={link.href}
                  className={`nav-link px-4 py-2 text-sm rounded-lg transition-colors duration-150 ${pathname === link.href ? 'text-white bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/auth/login" className="text-sm text-white/60 hover:text-white transition-colors px-3 py-2">
                Sign in
              </Link>
              <Link href="/auth/signup" className="btn-primary btn-sm">
                Start free trial
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>

            {/* Mobile burger */}
            <button onClick={() => setMobileOpen(o => !o)} className="md:hidden p-2 text-white/60 hover:text-white transition-colors">
              {mobileOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-slide-down" style={{ top: 64 }}>
          <div className="nav-glass min-h-screen px-6 py-8 space-y-2">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${pathname === link.href ? 'text-white bg-white/8' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                {link.label}
              </Link>
            ))}
            <div className="pt-6 space-y-3">
              <Link href="/auth/login" className="block text-center py-3 text-white/60 hover:text-white text-base font-medium">Sign in</Link>
              <Link href="/auth/signup" className="btn-primary w-full justify-center text-base">Start free trial →</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
