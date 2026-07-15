/** Normaliza CNPJ para apenas dígitos (14). Retorna null se inválido. */
export function normalizeCnpj(value: string | undefined | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length === 14 ? digits : null;
}

export function formatCnpj(digits: string): string {
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}
