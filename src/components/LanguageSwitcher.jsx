import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="relative h-full bg-[#4A0C16] hover:bg-[#31080E] text-[#FDF5E6] px-4 rounded-xl flex items-center gap-2 font-bold transition duration-300 shadow-md text-xs border border-transparent">
      <Globe size={14} className="text-[#E09F26]" />
      <select
        value={i18n.language}
        onChange={changeLanguage}
        className="bg-transparent text-[#FDF5E6] font-bold focus:outline-none cursor-pointer appearance-none tracking-wide"
      >
        <option value="en" className="text-gray-800 font-bold">English</option>
        <option value="tl" className="text-gray-800 font-bold">Tagalog</option>
        <option value="mrw" className="text-gray-800 font-bold">Meranaw</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;