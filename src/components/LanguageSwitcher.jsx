import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="relative bg-[#4A0C16] hover:bg-[#31080E] text-[#FDF5E6] px-3.5 py-2 rounded-xl flex items-center gap-2 font-bold transition duration-300 shadow-md text-xs border border-[#E09F26]/30 cursor-pointer">
      <Globe size={15} className="text-[#E09F26] shrink-0" />
      
      <select
        value={i18n.language}
        onChange={changeLanguage}
        className="bg-transparent text-[#FDF5E6] font-bold focus:outline-none cursor-pointer appearance-none tracking-wide pr-5 py-0.5 z-10"
      >
        <option value="en" className="bg-white text-gray-900 font-bold">English</option>
        <option value="tl" className="bg-white text-gray-900 font-bold">Tagalog</option>
        <option value="mrw" className="bg-white text-gray-900 font-bold">Meranaw</option>
      </select>

      {/* Custom Chevron Indicator */}
      <ChevronDown size={14} className="text-[#E09F26] absolute right-2.5 pointer-events-none" />
    </div>
  );
};

export default LanguageSwitcher;