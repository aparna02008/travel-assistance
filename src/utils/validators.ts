export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(cleaned.slice(2));
  }
  return /^[6-9]\d{9}$/.test(cleaned);
};

export const extractPhone = (text: string): string | null => {
  const cleaned = text.replace(/[\s\-\(\)\+]/g, '');
  // 12-digit with country code 91
  if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]\d{9}$/.test(cleaned.slice(2))) {
    return cleaned.slice(2);
  }
  // 10 digits
  const digitsOnly = text.replace(/\D/g, '');
  if (digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly)) {
    return digitsOnly;
  }
  // Standard regex match for 10-digit starting with 6-9
  const match10 = text.match(/\b[6-9]\d{9}\b/);
  if (match10) {
    return match10[0];
  }
  return null;
};

export const extractNumber = (input: string): number | null => {
  const match = input.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0]);
  return isNaN(num) ? null : num;
};
