import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaNewspaper } from 'react-icons/fa';

const categories = [
  'general',
  'business',
  'entertainment',
  'health',
  'science',
  'sports',
  'technology'
];

const Navbar = ({ onCategorySelect }) => {
  const navigate = useNavigate();

  const handleCategoryClick = (category) => {
    onCategorySelect(category);
    navigate(`/category/${category}`);
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <FaNewspaper className="h-8 w-8 text-blue-600 mr-2" />
            <Link to="/" className="text-xl font-bold text-gray-800">
              News Sentiment
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors capitalize"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
