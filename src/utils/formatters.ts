export const onlyDigits = (value?: string | number | null) => String(value ?? '').replace(/\D/g, '');

export const formatCpf = (value?: string | number | null) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const formatCnpj = (value?: string | number | null) => {
  const digits = onlyDigits(value).slice(0, 14);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export const formatCpfCnpj = (value?: string | number | null) => {
  const digits = onlyDigits(value);
  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
};

export const formatPhoneBR = (value?: string | number | null) => {
  let digits = onlyDigits(value);

  if (digits.startsWith('55') && digits.length > 2) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (!digits) return '';

  const area = digits.slice(0, 2);
  const number = digits.slice(2);

  if (digits.length <= 2) return `+55 (${area}`;

  const isMobile = number.startsWith('9');
  const firstPartLength = isMobile ? 5 : 4;
  const firstPart = number.slice(0, firstPartLength);
  const secondPart = number.slice(firstPartLength, firstPartLength + 4);

  if (!secondPart) return `+55 (${area}) ${firstPart}`;
  return `+55 (${area}) ${firstPart}-${secondPart}`;
};

export const formatAddressTitleCase = (value?: string | null) => {
  const text = String(value ?? '').toLowerCase();
  return text.replace(/(^|\s)(\S)/g, (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
};
