import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'th' | 'la' | 'vi' | 'zh' | 'en';

interface Translations {
  siteName: string;
  siteNameSub: string;
  about: string;
  units: string;
  services: string;
  market: string;
  env: string;
  partners: string;
  contact: string;
  dashboard: string;
  seedlingCenter: string;
  riceMill: string;
  viewUnits: string;
  heroBadge: string;
  heroPoints: string[];
}

const translations: Record<Language, Translations> = {
  th: {
    siteName: 'กลุ่มแม่โขงสินทรัพย์',
    siteNameSub: 'Mekong Sinsup',
    about: 'เกี่ยวกับเรา',
    units: 'หน่วยธุรกิจ',
    services: 'บริการ',
    market: 'ตลาด',
    env: 'สิ่งแวดล้อม',
    partners: 'พันธมิตร',
    contact: 'ติดต่อเรา',
    dashboard: 'เข้าใช้บริการ',
    seedlingCenter: 'ศูนย์เพาะกล้า',
    riceMill: 'โรงสี',
    viewUnits: 'ดูหน่วยธุรกิจ',
    heroBadge: 'เกษตรแม่นยำ · นครพนม · ประเทศไทย',
    heroPoints: [
      '1 คือ เชิดชู เกียรติ และยกย่อง อาชีพชาวนาเป็นที่ 1 ซึ่งรากฐานของชนบท',
      '2 ลด คือ ลดต้นทุนการผลิตข้าว และลดการผูกขาดที่ทำให้ชาวนาอ่อนแอ',
      '3 เพิ่ม คือ เพิ่มผลผลิตข้าวตามหลักวิชาการที่ถูกต้อง สร้างกลไกการเพิ่มมูลค่าข้าวให้ชาวนา เพื่อเพิ่มรายได้ของครอบครัวชาวนาให้มีคุณภาพชีวิตที่ดีขึ้น'
    ],
  },
  la: {
    siteName: 'ແມ່ນ້ຳຂອງສິນຊັບ',
    siteNameSub: 'Mekong Sinsup',
    about: 'ກ່ຽວກັບພວກເຮົາ',
    units: 'ຫົວໜ່ວຍທຸລະກິດ',
    services: 'ການບໍລິການ',
    market: 'ຕະຫຼາດ',
    env: 'ສິ່ງແວດລ້ອມ',
    partners: 'ພັນທະມິດ',
    contact: 'ຕິດຕໍ່ພວກເຮົາ',
    dashboard: 'ແດຊບອດ',
    seedlingCenter: 'ສູນເພາະກ້າ',
    riceMill: 'ໂຮງສີ',
    viewUnits: 'ເບິ່ງຫົວໜ່ວຍທຸລະກິດ',
    heroBadge: 'ກະສິກຳທີ່ຊັດເຈນ · ນະຄອນພະນົມ · ປະເທດໄທ',
    heroPoints: [
      '1 ແມ່ນຍົກຍ້ອງກຽດສັກສີຂອງຊາວນາເປັນອັນດັບ 1 ເຊິ່ງເປັນພື້ນຖານຂອງຊົນນະບົດ',
      '2 ແມ່ນຫຼຸດຜ່ອນຕົ້ນທຶນການຜະລິດ ແລະ ຫຼຸດຜ່ອນການຜູກຂາດ',
      '3 ແມ່ນເພີ່ມຜົນຜະລິດ ແລະ ສ້າງກົນໄກການເພີ່ມມູນຄ່າເພື່ອລາຍໄດ້ທີ່ດີຂຶ້ນ'
    ],
  },
  vi: {
    siteName: 'Tài sản Cửu Long',
    siteNameSub: 'Mekong Sinsup',
    about: 'Về chúng tôi',
    units: 'Đơn vị kinh doanh',
    services: 'Dịch vụ',
    market: 'Thị trường',
    env: 'Môi trường',
    partners: 'Đối tác',
    contact: 'Liên hệ',
    dashboard: 'Bảng điều khiển',
    seedlingCenter: 'Trung tâm cây giống',
    riceMill: 'Nhà máy gạo',
    viewUnits: 'Xem đơn vị',
    heroBadge: 'Nông nghiệp chính xác · Nakhon Phanom · Thái Lan',
    heroPoints: [
      '1 Tôn vinh danh dự và nghề nông là số 1, nền tảng của nông thôn',
      '2 Giảm chi phí sản xuất và giảm sự độc quyền làm suy yếu nông dân',
      '3 Tăng năng suất và tạo cơ chế nâng cao giá trị để có thu nhập tốt hơn'
    ],
  },
  zh: {
    siteName: '湄公财富',
    siteNameSub: 'Mekongsinsup',
    about: '关于我们',
    units: '业务部门',
    services: '服务项目',
    market: '市场',
    env: '环境',
    partners: '合作伙伴',
    contact: '联系我们',
    dashboard: '仪表板',
    seedlingCenter: '育苗中心',
    riceMill: '碾米厂',
    viewUnits: '查看业务',
    heroBadge: '精准农业 · 那空拍侬府 · 泰国',
    heroPoints: [
      '1 弘扬农民荣誉，视农业为农村之本',
      '2 降低生产成本，打破削弱农民的垄断',
      '3 提高产量，建立增值机制以增加农民收入'
    ],
  },
  en: {
    siteName: 'Mekongsinsup',
    siteNameSub: 'Agricultural Hub',
    about: 'About Us',
    units: 'Business Units',
    services: 'Services',
    market: 'Market',
    env: 'Environment',
    partners: 'Partners',
    contact: 'Contact Us',
    dashboard: 'Dashboard',
    seedlingCenter: 'Seedling Center',
    riceMill: 'Rice Mill',
    viewUnits: 'View Business Units',
    heroBadge: 'Precision Ag · Nakhon Phanom · Thailand',
    heroPoints: [
      '1 Honor the dignity of farmers as the foundation of our rural roots',
      '2 Reduce production costs and minimize monopolies that weaken farmers',
      '3 Increase productivity and value-addition mechanisms for better living'
    ],
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'th';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const languages = [
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'la', name: 'ລາວ', flag: '🇱🇦' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
] as const;
