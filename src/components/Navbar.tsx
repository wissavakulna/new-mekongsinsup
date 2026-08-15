import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wheat, Sprout, ChevronDown, Languages, Check, Coins } from "lucide-react";
import Logo from "./Logo";
import { useLanguage, languages } from "../contexts/LanguageContext";

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState("");
  const [showDashboardDropdown, setShowDashboardDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let current = "";
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 80) {
          current = section.id;
        }
      });
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: t.about, href: "#about", id: "about" },
    { name: t.units, href: "#units", id: "units" },
    { name: t.env, href: "#env", id: "env" },
  ];

  const dashboardLinks = [
    { name: t.seedlingCenter, href: "/dashboard/seedling", icon: <Sprout size={16} /> },
    { name: t.riceMill, href: "/dashboard/mill", icon: <Wheat size={16} /> },
    { name: "ระบบคุมงบประมาณและบุคลากรโรงสี (ERP Panel)", href: "/dashboard/erp", icon: <Coins size={16} /> },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[900] bg-white/97 backdrop-blur-2xl border-b border-border h-16 px-8 flex items-center justify-between">
      <a className="flex items-center gap-[10px] no-underline" href="#top">
        <div className="flex items-center justify-center text-white overflow-hidden">
          <Logo size={42} color="white" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-g9 leading-tight">{t.siteName}</div>
          <div className="text-[10px] text-light">{t.siteNameSub}</div>
        </div>
      </a>
      <ul className="hidden md:flex gap-0 list-none">
        {navLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={`text-[13px] font-medium no-underline px-[14px] py-1.5 rounded-[7px] transition-all duration-200 ${
                activeSection === link.id ? "text-g7 bg-g1" : "text-mid hover:text-g7 hover:bg-g1"
              }`}
            >
              {link.name}
            </a>
          </li>
        ))}
        {/* Dashboard Dropdown */}
        <li 
          className="relative group"
          onMouseEnter={() => setShowDashboardDropdown(true)}
          onMouseLeave={() => setShowDashboardDropdown(false)}
        >
          <button
            className={`flex items-center gap-1 text-[13px] font-bold no-underline px-[14px] py-1.5 rounded-[7px] transition-all duration-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 cursor-pointer border border-emerald-100/50`}
          >
            📊 {t.dashboard}
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDashboardDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showDashboardDropdown && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-border shadow-xl rounded-xl overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              {dashboardLinks.map((sub) => {
                const isExternal = sub.href.startsWith("http");
                if (isExternal) {
                  return (
                    <a
                      key={sub.href}
                      href={sub.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors no-underline"
                      onClick={() => setShowDashboardDropdown(false)}
                    >
                      <span className="text-emerald-600">{sub.icon}</span> {sub.name}
                    </a>
                  );
                }
                return (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors no-underline"
                    onClick={() => setShowDashboardDropdown(false)}
                  >
                    <span className="text-emerald-600">{sub.icon}</span> {sub.name}
                  </Link>
                );
              })}
            </div>
          )}
        </li>

        {/* Language Switcher */}
        <li 
          className="relative"
          onMouseEnter={() => setShowLangDropdown(true)}
          onMouseLeave={() => setShowLangDropdown(false)}
        >
          <button
            className="flex items-center gap-1.5 text-[13px] font-medium text-mid hover:text-g7 hover:bg-g1 px-3 py-1.5 rounded-[7px] transition-all duration-200 cursor-pointer"
          >
            <Languages size={16} />
            <span className="hidden lg:inline">{languages.find(l => l.code === language)?.name}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showLangDropdown && (
            <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-border shadow-xl rounded-xl overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as any);
                    setShowLangDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                  {language === lang.code && <Check size={14} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </li>
      </ul>
    </nav>
  );
}
