import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white-200 dark:bg-gray-800 p-4 text-center text-gray-600 dark:text-gray-300 text-sm">
      <div className="ml-4 lg:ml-0">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white">
              <p>&copy; {new Date().getFullYear()} Parabellum Groups. Tous droits réservés.</p>
          </h6>
      </div>
    </footer>
  );
};
