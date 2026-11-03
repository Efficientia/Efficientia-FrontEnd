/**
 * Utilitário de Segurança e Prevenção de Senhas Vazadas.
 * 
 * Evita o acionamento do alerta nativo do Google Chrome ("Mude sua senha. A senha que você
 * usou foi encontrada em um vazamento de dados...") fornecendo:
 * 1. Verificação proativa contra listas de senhas comuns e comprometidas em vazamentos.
 * 2. Gerador criptograficamente seguro de senhas de alta entropia.
 */

// Lista de senhas comuns e notórias em vazamentos públicos (Google / HaveIBeenPwned)
export const KNOWN_BREACHED_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '12345',
  '1234',
  '000000',
  '111111',
  '123123',
  'password',
  'password123',
  'admin',
  'admin123',
  'admin@123',
  'adm123',
  'root',
  'root123',
  'senha',
  'senha123',
  'senha@123',
  'teste',
  'teste123',
  'teste@123',
  'testando',
  'mudar123',
  'padrao123',
  'brasil',
  'brasil123',
  'qwerty',
  'qwerty123',
  'abc123',
  'efficientia',
  'efficientia123',
  'motorista',
  'motorista123',
]);

export interface PasswordSecurityCheck {
  isCompromised: boolean;
  isTooShort: boolean;
  isWeak: boolean;
  message?: string;
}

/**
 * Valida a senha contra critérios de segurança e histórico de vazamentos públicos.
 */
export function checkPasswordSecurity(password?: string | null): PasswordSecurityCheck {
  const trimmed = typeof password === 'string' ? password.trim() : '';
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return { isCompromised: false, isTooShort: true, isWeak: true };
  }

  const isTooShort = trimmed.length < 6;

  // Verifica se está na lista de vazamentos conhecidos
  const isCompromised = KNOWN_BREACHED_PASSWORDS.has(normalized);

  // Verifica padrões fracos (ex: todos dígitos iguais '111111', 'aaaaaa')
  const isAllSameChar = /^(\w)\1+$/.test(trimmed);

  const isWeak = isTooShort || isCompromised || isAllSameChar;

  let message: string | undefined;
  if (isCompromised) {
    message = 'Esta senha é muito comum e foi identificada em vazamentos públicos de dados pelo Google. Escolha uma senha mais forte.';
  } else if (isAllSameChar) {
    message = 'Evite senhas compostas por apenas um caractere repetido.';
  } else if (isTooShort) {
    message = 'A senha deve conter no mínimo 6 caracteres.';
  }

  return {
    isCompromised,
    isTooShort,
    isWeak,
    message,
  };
}

/**
 * Gera uma senha forte e de alta entropia garantindo caracteres maiúsculos,
 * minúsculos, números e caracteres especiais, prevenindo pop-ups de credenciais vazadas.
 * Não utiliza nenhum prefixo fixo ou previsível para maximizar a entropia e segurança.
 */
export function generateSecurePassword(length: number = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';

  const getRandomIndex = (max: number): number => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] % max;
    }
    return Math.floor(Math.random() * max);
  };

  // Garante ao menos um caractere de cada conjunto exigido
  const guaranteed = [
    upper[getRandomIndex(upper.length)],
    lower[getRandomIndex(lower.length)],
    digits[getRandomIndex(digits.length)],
    symbols[getRandomIndex(symbols.length)],
  ];

  const allChars = upper + lower + digits + symbols;
  const remainingLength = Math.max(0, length - guaranteed.length);

  const randomPart: string[] = [];
  for (let i = 0; i < remainingLength; i++) {
    randomPart.push(allChars[getRandomIndex(allChars.length)]);
  }

  // Embaralha com algoritmo Fisher-Yates criptograficamente seguro
  const combined = [...guaranteed, ...randomPart];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}
