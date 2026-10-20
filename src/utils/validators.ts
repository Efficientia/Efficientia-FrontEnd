const CPF_FORMAT = /^\d{11}$/;
const BRAZILIAN_LICENSE_PLATE_FORMAT = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/i;

export function isValidCpfFormat(value: string): boolean {
  return CPF_FORMAT.test(value.replace(/[.-]/g, ''));
}

export function isValidBrazilianLicensePlate(value: string): boolean {
  return BRAZILIAN_LICENSE_PLATE_FORMAT.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidCnpjFormat(value: string): boolean {
  const clean = value.replace(/\D/g, '');
  return clean.length === 14;
}
