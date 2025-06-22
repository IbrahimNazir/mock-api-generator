import React from 'react';

const Navbar = ({ onLogout }) => {
  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">MockAPI Clone</h1>
        <button onClick={onLogout} className="px-4 py-2 bg-red-500 rounded hover:bg-red-600">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;