// Internationalization (i18n) utilities for TurboFix
import React from 'react';

// Supported languages and locales
export const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
};

const DEFAULT_LANGUAGE = 'en';

// Translation keys and messages (extensible)
const TRANSLATIONS = {
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.add': 'Add',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Information',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.machines': 'Machines',
    'nav.tickets': 'Tickets',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.help': 'Help',

    // Machine Status
    'machine.running': 'Running',
    'machine.idle': 'Idle',
    'machine.alert': 'Alert',
    'machine.maintenance': 'Maintenance',
    'machine.offline': 'Offline',

    // Ticket Status
    'ticket.open': 'Open',
    'ticket.in_progress': 'In Progress',
    'ticket.completed': 'Completed',
    'ticket.cancelled': 'Cancelled',

    // Time
    'time.just_now': 'just now',
    'time.minutes_ago': '{n} minutes ago',
    'time.hours_ago': '{n} hours ago',
    'time.days_ago': '{n} days ago',
    'time.months_ago': '{n} months ago',

    // Messages
    'msg.welcome': 'Welcome to TurboFix',
    'msg.loading_data': 'Loading data...',
    'msg.no_data': 'No data available',
    'msg.confirm_delete': 'Are you sure you want to delete this item?',
  },

  es: {
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.close': 'Cerrar',
    'common.add': 'Añadir',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.warning': 'Advertencia',
    'common.info': 'Información',

    'nav.dashboard': 'Panel de Control',
    'nav.machines': 'Máquinas',
    'nav.tickets': 'Tickets',
    'nav.analytics': 'Análisis',
    'nav.settings': 'Configuración',
    'nav.help': 'Ayuda',

    'machine.running': 'En funcionamiento',
    'machine.idle': 'Inactivo',
    'machine.alert': 'Alerta',
    'machine.maintenance': 'Mantenimiento',
    'machine.offline': 'Desconectado',

    'ticket.open': 'Abierto',
    'ticket.in_progress': 'En Progreso',
    'ticket.completed': 'Completado',
    'ticket.cancelled': 'Cancelado',

    'time.just_now': 'hace poco',
    'time.minutes_ago': 'hace {n} minutos',
    'time.hours_ago': 'hace {n} horas',
    'time.days_ago': 'hace {n} días',
    'time.months_ago': 'hace {n} meses',

    'msg.welcome': 'Bienvenido a TurboFix',
    'msg.loading_data': 'Cargando datos...',
    'msg.no_data': 'No hay datos disponibles',
    'msg.confirm_delete': '¿Está seguro de que desea eliminar este elemento?',
  },

  fr: {
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.add': 'Ajouter',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.warning': 'Avertissement',
    'common.info': 'Information',

    'nav.dashboard': 'Tableau de bord',
    'nav.machines': 'Machines',
    'nav.tickets': 'Tickets',
    'nav.analytics': 'Analyses',
    'nav.settings': 'Paramètres',
    'nav.help': 'Aide',

    'machine.running': 'En cours d\'exécution',
    'machine.idle': 'Inactif',
    'machine.alert': 'Alerte',
    'machine.maintenance': 'Maintenance',
    'machine.offline': 'Hors ligne',

    'ticket.open': 'Ouvert',
    'ticket.in_progress': 'En cours',
    'ticket.completed': 'Complété',
    'ticket.cancelled': 'Annulé',

    'time.just_now': 'à l\'instant',
    'time.minutes_ago': 'il y a {n} minutes',
    'time.hours_ago': 'il y a {n} heures',
    'time.days_ago': 'il y a {n} jours',
    'time.months_ago': 'il y a {n} mois',

    'msg.welcome': 'Bienvenue sur TurboFix',
    'msg.loading_data': 'Chargement des données...',
    'msg.no_data': 'Aucune donnée disponible',
    'msg.confirm_delete': 'Êtes-vous sûr de vouloir supprimer cet élément?',

    'counter.title': 'Compteur',
    'counter.current_value': 'Valeur actuelle',
    'counter.decrease': 'Diminuer',
    'counter.increase': 'Augmenter',
    'counter.reset': 'Réinitialiser',
    'counter.at_minimum': 'Minimum atteint',
    'counter.at_maximum': 'Maximum atteint',
    'counter.range_info': 'Plage: {min} à {max}',
    'counter.min_info': 'Minimum: {min}',
    'counter.max_info': 'Maximum: {max}',
  },

  de: {
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.close': 'Schließen',
    'common.add': 'Hinzufügen',
    'common.loading': 'Wird geladen...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.warning': 'Warnung',
    'common.info': 'Information',

    'nav.dashboard': 'Dashboard',
    'nav.machines': 'Maschinen',
    'nav.tickets': 'Tickets',
    'nav.analytics': 'Analytik',
    'nav.settings': 'Einstellungen',
    'nav.help': 'Hilfe',

    'machine.running': 'Läuft',
    'machine.idle': 'Leerlauf',
    'machine.alert': 'Warnung',
    'machine.maintenance': 'Wartung',
    'machine.offline': 'Offline',

    'ticket.open': 'Offen',
    'ticket.in_progress': 'In Bearbeitung',
    'ticket.completed': 'Abgeschlossen',
    'ticket.cancelled': 'Storniert',

    'time.just_now': 'gerade eben',
    'time.minutes_ago': 'vor {n} Minuten',
    'time.hours_ago': 'vor {n} Stunden',
    'time.days_ago': 'vor {n} Tagen',
    'time.months_ago': 'vor {n} Monaten',

    'msg.welcome': 'Willkommen bei TurboFix',
    'msg.loading_data': 'Daten werden geladen...',
    'msg.no_data': 'Keine Daten verfügbar',
    'msg.confirm_delete': 'Möchten Sie diesen Artikel wirklich löschen?',

    'counter.title': 'Zähler',
    'counter.current_value': 'Aktueller Wert',
    'counter.decrease': 'Verringern',
    'counter.increase': 'Erhöhen',
    'counter.reset': 'Zurücksetzen',
    'counter.at_minimum': 'Minimum erreicht',
    'counter.at_maximum': 'Maximum erreicht',
    'counter.range_info': 'Bereich: {min} bis {max}',
    'counter.min_info': 'Minimum: {min}',
    'counter.max_info': 'Maximum: {max}',
  },

  pt: {
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.close': 'Fechar',
    'common.add': 'Adicionar',
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.warning': 'Aviso',
    'common.info': 'Informação',

    'nav.dashboard': 'Painel',
    'nav.machines': 'Máquinas',
    'nav.tickets': 'Tickets',
    'nav.analytics': 'Análise',
    'nav.settings': 'Configurações',
    'nav.help': 'Ajuda',

    'machine.running': 'Em execução',
    'machine.idle': 'Ocioso',
    'machine.alert': 'Alerta',
    'machine.maintenance': 'Manutenção',
    'machine.offline': 'Offline',

    'ticket.open': 'Aberto',
    'ticket.in_progress': 'Em andamento',
    'ticket.completed': 'Concluído',
    'ticket.cancelled': 'Cancelado',

    'time.just_now': 'agora mesmo',
    'time.minutes_ago': 'há {n} minutos',
    'time.hours_ago': 'há {n} horas',
    'time.days_ago': 'há {n} dias',
    'time.months_ago': 'há {n} meses',

    'msg.welcome': 'Bem-vindo ao TurboFix',
    'msg.loading_data': 'Carregando dados...',
    'msg.no_data': 'Nenhum dado disponível',
    'msg.confirm_delete': 'Tem certeza de que deseja excluir este item?',

    'counter.title': 'Contador',
    'counter.current_value': 'Valor atual',
    'counter.decrease': 'Diminuir',
    'counter.increase': 'Aumentar',
    'counter.reset': 'Redefinir',
    'counter.at_minimum': 'Mínimo atingido',
    'counter.at_maximum': 'Máximo atingido',
    'counter.range_info': 'Intervalo: {min} a {max}',
    'counter.min_info': 'Mínimo: {min}',
    'counter.max_info': 'Máximo: {max}',
  },

  ja: {
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.close': '閉じる',
    'common.add': '追加',
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    'common.warning': '警告',
    'common.info': '情報',

    'nav.dashboard': 'ダッシュボード',
    'nav.machines': 'マシン',
    'nav.tickets': 'チケット',
    'nav.analytics': '分析',
    'nav.settings': '設定',
    'nav.help': 'ヘルプ',

    'machine.running': '実行中',
    'machine.idle': 'アイドル',
    'machine.alert': 'アラート',
    'machine.maintenance': 'メンテナンス',
    'machine.offline': 'オフライン',

    'ticket.open': 'オープン',
    'ticket.in_progress': '進行中',
    'ticket.completed': '完了',
    'ticket.cancelled': 'キャンセル済み',

    'time.just_now': 'たった今',
    'time.minutes_ago': '{n}分前',
    'time.hours_ago': '{n}時間前',
    'time.days_ago': '{n}日前',
    'time.months_ago': '{n}ヶ月前',

    'msg.welcome': 'TurboFixへようこそ',
    'msg.loading_data': 'データを読み込み中...',
    'msg.no_data': 'データがありません',
    'msg.confirm_delete': 'このアイテムを削除してもよろしいですか？',

    'counter.title': 'カウンター',
    'counter.current_value': '現在の値',
    'counter.decrease': '減らす',
    'counter.increase': '増やす',
    'counter.reset': 'リセット',
    'counter.at_minimum': '最小値に達しました',
    'counter.at_maximum': '最大値に達しました',
    'counter.range_info': '範囲: {min}から{max}',
    'counter.min_info': '最小値: {min}',
    'counter.max_info': '最大値: {max}',
  },

  zh: {
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.close': '关闭',
    'common.add': '添加',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.warning': '警告',
    'common.info': '信息',

    'nav.dashboard': '仪表盘',
    'nav.machines': '机器',
    'nav.tickets': '工单',
    'nav.analytics': '分析',
    'nav.settings': '设置',
    'nav.help': '帮助',

    'machine.running': '运行中',
    'machine.idle': '空闲',
    'machine.alert': '警报',
    'machine.maintenance': '维护',
    'machine.offline': '离线',

    'ticket.open': '打开',
    'ticket.in_progress': '进行中',
    'ticket.completed': '已完成',
    'ticket.cancelled': '已取消',

    'time.just_now': '刚刚',
    'time.minutes_ago': '{n}分钟前',
    'time.hours_ago': '{n}小时前',
    'time.days_ago': '{n}天前',
    'time.months_ago': '{n}个月前',

    'msg.welcome': '欢迎使用TurboFix',
    'msg.loading_data': '正在加载数据...',
    'msg.no_data': '没有可用数据',
    'msg.confirm_delete': '确定要删除此项目吗？',

    'counter.title': '计数器',
    'counter.current_value': '当前值',
    'counter.decrease': '减少',
    'counter.increase': '增加',
    'counter.reset': '重置',
    'counter.at_minimum': '已达到最小值',
    'counter.at_maximum': '已达到最大值',
    'counter.range_info': '范围: {min}到{max}',
    'counter.min_info': '最小值: {min}',
    'counter.max_info': '最大值: {max}',
  },

  ar: {
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.close': 'إغلاق',
    'common.add': 'إضافة',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.warning': 'تحذير',
    'common.info': 'معلومات',

    'nav.dashboard': 'لوحة التحكم',
    'nav.machines': 'الآلات',
    'nav.tickets': 'التذاكر',
    'nav.analytics': 'التحليلات',
    'nav.settings': 'الإعدادات',
    'nav.help': 'مساعدة',

    'machine.running': 'قيد التشغيل',
    'machine.idle': 'خامل',
    'machine.alert': 'تنبيه',
    'machine.maintenance': 'الصيانة',
    'machine.offline': 'غير متصل',

    'ticket.open': 'مفتوح',
    'ticket.in_progress': 'قيد المعالجة',
    'ticket.completed': 'مكتمل',
    'ticket.cancelled': 'ملغى',

    'time.just_now': 'للتو',
    'time.minutes_ago': 'قبل {n} دقائق',
    'time.hours_ago': 'قبل {n} ساعات',
    'time.days_ago': 'قبل {n} أيام',
    'time.months_ago': 'قبل {n} أشهر',

    'msg.welcome': 'أهلا وسهلا بك في TurboFix',
    'msg.loading_data': 'جاري تحميل البيانات...',
    'msg.no_data': 'لا توجد بيانات متاحة',
    'msg.confirm_delete': 'هل أنت متأكد من أنك تريد حذف هذا العنصر؟',

    'counter.title': 'عداد',
    'counter.current_value': 'القيمة الحالية',
    'counter.decrease': 'إنقاص',
    'counter.increase': 'زيادة',
    'counter.reset': 'إعادة تعيين',
    'counter.at_minimum': 'وصل الحد الأدنى',
    'counter.at_maximum': 'وصل الحد الأقصى',
    'counter.range_info': 'النطاق: {min} إلى {max}',
    'counter.min_info': 'الحد الأدنى: {min}',
    'counter.max_info': 'الحد الأقصى: {max}',
  },

  hi: {
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.close': 'बंद करें',
    'common.add': 'जोड़ें',
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'त्रुटि',
    'common.success': 'सफल',
    'common.warning': 'चेतावनी',
    'common.info': 'जानकारी',

    'nav.dashboard': 'डैशबोर्ड',
    'nav.machines': 'मशीनें',
    'nav.tickets': 'टिकट',
    'nav.analytics': 'विश्लेषण',
    'nav.settings': 'सेटिंग्स',
    'nav.help': 'सहायता',

    'machine.running': 'चल रहा है',
    'machine.idle': 'निष्क्रिय',
    'machine.alert': 'सतर्कता',
    'machine.maintenance': 'रखरखाव',
    'machine.offline': 'ऑफलाइन',

    'ticket.open': 'खुला',
    'ticket.in_progress': 'प्रगति में',
    'ticket.completed': 'पूर्ण',
    'ticket.cancelled': 'रद्द',

    'time.just_now': 'अभी-अभी',
    'time.minutes_ago': '{n} मिनट पहले',
    'time.hours_ago': '{n} घंटे पहले',
    'time.days_ago': '{n} दिन पहले',
    'time.months_ago': '{n} महीने पहले',

    'msg.welcome': 'TurboFix में आपका स्वागत है',
    'msg.loading_data': 'डेटा लोड हो रहा है...',
    'msg.no_data': 'कोई डेटा उपलब्ध नहीं',
    'msg.confirm_delete': 'क्या आप इस आइटम को हटाना चाहते हैं?',

    'counter.title': 'गिनती',
    'counter.current_value': 'वर्तमान मान',
    'counter.decrease': 'घटाएं',
    'counter.increase': 'बढ़ाएं',
    'counter.reset': 'पुनः सेट करें',
    'counter.at_minimum': 'न्यूनतम पहुंचा',
    'counter.at_maximum': 'अधिकतम पहुंचा',
    'counter.range_info': 'श्रेणी: {min} से {max}',
    'counter.min_info': 'न्यूनतम: {min}',
    'counter.max_info': 'अधिकतम: {max}',
  },

  mr: {
    'common.save': 'जतन करा',
    'common.cancel': 'रद्द करा',
    'common.delete': 'हटवा',
    'common.edit': 'संपादित करा',
    'common.close': 'बंद करा',
    'common.add': 'जोडा',
    'common.loading': 'लोड होत आहे...',
    'common.error': 'त्रुटी',
    'common.success': 'यश',
    'common.warning': 'सावधानी',
    'common.info': 'माहिती',

    'nav.dashboard': 'डॅशबोर्ड',
    'nav.machines': 'मशीन्स',
    'nav.tickets': 'तिकिटे',
    'nav.analytics': 'विश्लेषण',
    'nav.settings': 'सेटिंग्स',
    'nav.help': 'मदत',

    'machine.running': 'चालू आहे',
    'machine.idle': 'निष्क्रिय',
    'machine.alert': 'सतर्कता',
    'machine.maintenance': 'देखभाल',
    'machine.offline': 'ऑफलाइन',

    'ticket.open': 'उघडले',
    'ticket.in_progress': 'प्रगतीत',
    'ticket.completed': 'पूर्ण',
    'ticket.cancelled': 'रद्द',

    'time.just_now': 'आत्ताच',
    'time.minutes_ago': '{n} मिनिटांपूर्वी',
    'time.hours_ago': '{n} तासांपूर्वी',
    'time.days_ago': '{n} दिवसांपूर्वी',
    'time.months_ago': '{n} महिन्यांपूर्वी',

    'msg.welcome': 'TurboFix मध्ये स्वागत आहे',
    'msg.loading_data': 'डेटा लोड होत आहे...',
    'msg.no_data': 'कोणतेही डेटा उपलब्ध नाही',
    'msg.confirm_delete': 'हे आयटम हटवायचे आहे काय?',

    'counter.title': 'गणक',
    'counter.current_value': 'वर्तमान मान',
    'counter.decrease': 'कमी करा',
    'counter.increase': 'वाढवा',
    'counter.reset': 'पुन: सेट करा',
    'counter.at_minimum': 'किमान पोहोचले',
    'counter.at_maximum': 'कमाल पोहोचले',
    'counter.range_info': 'श्रेणी: {min} ते {max}',
    'counter.min_info': 'किमान: {min}',
    'counter.max_info': 'कमाल: {max}',
  },
};

// i18n Manager Class
class I18nManager {
  constructor() {
    this.currentLanguage = this.getInitialLanguage();
    this.translations = TRANSLATIONS;
    this.listeners = new Set();
    // Apply font for the initial language immediately
    this._applyLangAttributes(this.currentLanguage);
  }

  getInitialLanguage() {
    // Check localStorage first
    const saved = localStorage.getItem('tf_language');
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      return saved;
    }

    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES[browserLang]) {
      return browserLang;
    }

    return DEFAULT_LANGUAGE;
  }

  setLanguage(langCode) {
    if (!SUPPORTED_LANGUAGES[langCode]) {
      console.warn(`Language ${langCode} not supported`);
      return;
    }

    this.currentLanguage = langCode;
    localStorage.setItem('tf_language', langCode);
    this._applyLangAttributes(langCode);
    this.notifyListeners();
  }

  // Centralised helper — applies lang, dir, and data-lang to <html>
  // so that CSS font-stack overrides keyed on [data-lang] fire correctly.
  _applyLangAttributes(langCode) {
    if (typeof document === 'undefined') return;
    const isRTL = SUPPORTED_LANGUAGES[langCode]?.rtl ?? false;
    document.documentElement.lang = langCode;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-dir', isRTL ? 'rtl' : 'ltr');
    // data-lang drives the per-language font-family overrides in index.css
    document.documentElement.setAttribute('data-lang', langCode);
  }

  getLanguage() {
    return this.currentLanguage;
  }

  getLanguageInfo() {
    return SUPPORTED_LANGUAGES[this.currentLanguage];
  }

  isRTL() {
    return SUPPORTED_LANGUAGES[this.currentLanguage].rtl;
  }

  // Translate a key with optional parameters
  t(key, params = {}) {
    const translations = this.translations[this.currentLanguage] || {};
    let message = translations[key] || key;

    // Replace parameters with HTML escaping (prevent XSS)
    message = message.replace(/\{(\w+)\}/g, (match, param) => {
      const value = params[param];
      if (value === undefined || value === null) return match;

      // HTML escape the parameter value
      const escaped = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      return escaped;
    });

    return message;
  }

  // Bulk translate multiple keys
  tm(keys) {
    const result = {};
    keys.forEach((key) => {
      result[key] = this.t(key);
    });
    return result;
  }

  // Add or update translations
  addTranslations(langCode, translations) {
    if (!this.translations[langCode]) {
      this.translations[langCode] = {};
    }
    this.translations[langCode] = {
      ...this.translations[langCode],
      ...translations
    };
  }

  // Subscribe to language changes
  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentLanguage);
      } catch (err) {
        console.error('Error in i18n listener:', err);
      }
    });
  }
}

export const i18n = new I18nManager();

// Date formatting utilities
export const dateFormatter = {
  formatDate(date, locale = i18n.getLanguage()) {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale).format(d);
  },

  formatDateTime(date, locale = i18n.getLanguage()) {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  },

  formatTime(date, locale = i18n.getLanguage()) {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  },

  formatRelative(date) {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);

    if (diff < 60) {
      return i18n.t('time.just_now');
    }
    if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return i18n.t('time.minutes_ago', { n: minutes });
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return i18n.t('time.hours_ago', { n: hours });
    }
    if (diff < 2592000) {
      const days = Math.floor(diff / 86400);
      return i18n.t('time.days_ago', { n: days });
    }

    const months = Math.floor(diff / 2592000);
    return i18n.t('time.months_ago', { n: months });
  }
};

// Number and currency formatting utilities
export const numberFormatter = {
  formatNumber(value, locale = i18n.getLanguage()) {
    return new Intl.NumberFormat(locale).format(value);
  },

  formatCurrency(value, currency = 'USD', locale = i18n.getLanguage()) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(value);
  },

  formatPercent(value, locale = i18n.getLanguage()) {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 2
    }).format(value / 100);
  },

  formatCompact(value, locale = i18n.getLanguage()) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return this.formatNumber(value, locale);
  }
};

// React hook for i18n
export function useI18n() {
  const [language, setLanguage] = React.useState(i18n.getLanguage());

  React.useEffect(() => {
    const unsubscribe = i18n.onChange((lang) => {
      setLanguage(lang);
    });

    return unsubscribe;
  }, []);

  return {
    language,
    setLanguage: (lang) => i18n.setLanguage(lang),
    t: (key, params) => i18n.t(key, params),
    isRTL: () => i18n.isRTL(),
    formatDate: (date) => dateFormatter.formatDate(date, language),
    formatDateTime: (date) => dateFormatter.formatDateTime(date, language),
    formatTime: (date) => dateFormatter.formatTime(date, language),
    formatRelative: (date) => dateFormatter.formatRelative(date),
    formatNumber: (value) => numberFormatter.formatNumber(value, language),
    formatCurrency: (value, currency) => numberFormatter.formatCurrency(value, currency, language),
    formatPercent: (value) => numberFormatter.formatPercent(value, language)
  };
}

// Re-export I18nProvider and I18nContext from i18n-provider.jsx
export { I18nProvider, I18nContext, useI18nContext } from './i18n-provider';
