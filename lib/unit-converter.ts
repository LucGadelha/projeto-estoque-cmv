// Definição das conversões possíveis entre unidades
const unitConversions: Record<string, Record<string, number>> = {
  // Volume
  L: {
    mL: 1000,
    L: 1,
  },
  mL: {
    L: 0.001,
    mL: 1,
  },
  // Massa
  Kg: {
    g: 1000,
    Kg: 1,
  },
  g: {
    Kg: 0.001,
    g: 1,
  },
  // Outros tipos de unidades não são conversíveis entre si
}

/**
 * Converte uma quantidade de uma unidade para outra
 * @param quantity Quantidade a ser convertida
 * @param fromUnit Unidade de origem
 * @param toUnit Unidade de destino
 * @returns A quantidade convertida ou null se a conversão não for possível
 */
export function convertUnits(quantity: number, fromUnit: string, toUnit: string): number | null {
  // Se as unidades forem iguais, não precisa converter
  if (fromUnit === toUnit) {
    return quantity
  }

  // Verifica se existe uma conversão direta
  if (unitConversions[fromUnit] && unitConversions[fromUnit][toUnit] !== undefined) {
    return quantity * unitConversions[fromUnit][toUnit]
  }

  // Verifica se existe uma conversão inversa
  if (unitConversions[toUnit] && unitConversions[toUnit][fromUnit] !== undefined) {
    return quantity / unitConversions[toUnit][fromUnit]
  }

  // Não foi possível converter
  return null
}

/**
 * Verifica se é possível converter entre duas unidades
 * @param fromUnit Unidade de origem
 * @param toUnit Unidade de destino
 * @returns true se a conversão for possível, false caso contrário
 */
export function canConvertUnits(fromUnit: string, toUnit: string): boolean {
  return convertUnits(1, fromUnit, toUnit) !== null
}
