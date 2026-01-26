import React from 'react';
import { Heart } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between space-y-2 sm:flex-row sm:space-y-0">
          <div className="text-center sm:text-left">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {currentYear} Parabellum ERP • Version 1.0.0
            </p>
          </div>
          
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Construit avec <Heart className="inline h-3 w-3 text-red-500" /> par l'équipe Parabellum
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
