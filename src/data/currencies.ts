export interface Currency {
  code: string;
  name: string;
  symbol: string;
  popular?: boolean;
}

export const CURRENCIES: Currency[] = [
  // Top Global & Regional Business Currencies
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', popular: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', popular: true },
  { code: 'EUR', name: 'Euro', symbol: '€', popular: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', popular: true },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', popular: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', popular: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', popular: true },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', popular: true },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', popular: true },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', popular: true },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', popular: true },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', popular: true },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', popular: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', popular: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', popular: true },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', popular: true },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', popular: true },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', popular: true },

  // World Currencies (Alphabetical)
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'BND', name: 'Brunei Dollar', symbol: 'B$' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs.' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'BWP', name: 'Botswanan Pula', symbol: 'P' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨' },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин.' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' }
];

export function findCurrencyByCode(code: string): Currency | undefined {
  const clean = String(code || '').trim().toUpperCase();
  return CURRENCIES.find((c) => c.code === clean);
}

export function searchCurrencies(query: string): Currency[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURRENCIES;

  return CURRENCIES.filter((c) => {
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  });
}
