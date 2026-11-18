import { CategoryId, CategoryMeta, TrainingSample, TransactionType } from '../types/budget';

export const DEFAULT_ML_SAMPLES: TrainingSample[] = [
  // Alimentación
  { id: 'ml-1', text: 'Coto supermercado compra mensual alimentos', category: 'alimentacion', amountHint: 280000, isDefault: true },
  { id: 'ml-2', text: 'Carrefour supermercado verdulería frutas alimentos', category: 'alimentacion', amountHint: 145000, isDefault: true },
  { id: 'ml-3', text: 'Carnicería carne asado pollo alimentos', category: 'alimentacion', amountHint: 95000, isDefault: true },
  { id: 'ml-4', text: 'Panadería pan leche queso alimentos', category: 'alimentacion', amountHint: 28000, isDefault: true },
  { id: 'ml-5', text: 'Jumbo supermercado compras despensa alimentos', category: 'alimentacion', amountHint: 180000, isDefault: true },
  { id: 'ml-6', text: 'Día supermercado lácteos leche yogur alimentos', category: 'alimentacion', amountHint: 65000, isDefault: true },
  { id: 'ml-7', text: 'Verdulería frutas verduras papa tomate', category: 'alimentacion', amountHint: 38000, isDefault: true },
  { id: 'ml-8', text: 'Almacén barrio pan yerba café despensa', category: 'alimentacion', amountHint: 42000, isDefault: true },
  { id: 'ml-9', text: 'Carnicería pescadería carne pollo compras', category: 'alimentacion', amountHint: 75000, isDefault: true },
  { id: 'ml-10', text: 'Almacén dietética frutas despensa semanal', category: 'alimentacion', amountHint: 34000, isDefault: true },

  // Impuestos y servicios
  { id: 'ml-11', text: 'Edenor factura electricidad luz servicio hogar', category: 'servicios', amountHint: 85000, isDefault: true },
  { id: 'ml-12', text: 'Metrogas boleta factura gas servicio hogar', category: 'servicios', amountHint: 62000, isDefault: true },
  { id: 'ml-13', text: 'AYSA factura servicio agua potable hogar', category: 'servicios', amountHint: 34000, isDefault: true },
  { id: 'ml-14', text: 'Fibertel Personal factura internet wifi servicio', category: 'servicios', amountHint: 54000, isDefault: true },
  { id: 'ml-15', text: 'Claro Movistar factura abono celular servicio', category: 'servicios', amountHint: 38000, isDefault: true },
  { id: 'ml-16', text: 'ABL boleta impuesto inmobiliario tasa municipal', category: 'servicios', amountHint: 49000, isDefault: true },
  { id: 'ml-17', text: 'Edesur factura boleta luz electricidad hogar', category: 'servicios', amountHint: 78000, isDefault: true },
  { id: 'ml-18', text: 'ARBA boleta impuesto patente servicio', category: 'servicios', amountHint: 65000, isDefault: true },

  // Ropa y zapatillas
  { id: 'ml-19', text: 'Zapatillas deportivas Nike calzado ropa', category: 'ropa', amountHint: 140000, isDefault: true },
  { id: 'ml-20', text: 'Zara ropa remeras pantalón indumentaria', category: 'ropa', amountHint: 115000, isDefault: true },
  { id: 'ml-21', text: 'Indumentaria ropa niños campera buzo', category: 'ropa', amountHint: 88000, isDefault: true },
  { id: 'ml-22', text: 'Calzado zapatos zapatillas cuero indumentaria', category: 'ropa', amountHint: 95000, isDefault: true },
  { id: 'ml-23', text: 'Adidas zapatillas conjunto ropa deportiva', category: 'ropa', amountHint: 105000, isDefault: true },
  { id: 'ml-24', text: 'Tienda indumentaria ropa remera campera abrigo', category: 'ropa', amountHint: 62000, isDefault: true },

  // Transporte y combustible
  { id: 'ml-25', text: 'YPF nafta super combustible auto', category: 'transporte', amountHint: 72000, isDefault: true },
  { id: 'ml-26', text: 'Shell nafta carga combustible auto', category: 'transporte', amountHint: 78000, isDefault: true },
  { id: 'ml-27', text: 'Peaje autopista auto transporte mensual', category: 'transporte', amountHint: 28000, isDefault: true },
  { id: 'ml-28', text: 'Carga tarjeta SUBE transporte colectivo subte', category: 'transporte', amountHint: 18000, isDefault: true },
  { id: 'ml-29', text: 'Mecánico taller service auto transporte', category: 'transporte', amountHint: 110000, isDefault: true },
  { id: 'ml-30', text: 'Estacionamiento cochera peaje auto', category: 'transporte', amountHint: 35000, isDefault: true },
  { id: 'ml-31', text: 'Axion combustible nafta gasoil ruta auto', category: 'transporte', amountHint: 69000, isDefault: true },

  // Salud y farmacia
  { id: 'ml-32', text: 'Farmacity farmacia medicamentos receta salud', category: 'salud', amountHint: 58000, isDefault: true },
  { id: 'ml-33', text: 'Farmacia medicamentos remedios vitaminas salud', category: 'salud', amountHint: 42000, isDefault: true },
  { id: 'ml-34', text: 'Consulta médica médico clínica análisis salud', category: 'salud', amountHint: 45000, isDefault: true },
  { id: 'ml-35', text: 'Odontólogo consulta médico dentista salud', category: 'salud', amountHint: 68000, isDefault: true },
  { id: 'ml-36', text: 'Óptica médico receta salud familia', category: 'salud', amountHint: 92000, isDefault: true },
  { id: 'ml-37', text: 'Prepaga consulta médica estudio farmacia salud', category: 'salud', amountHint: 85000, isDefault: true },

  // Escuela y gastos familiares
  { id: 'ml-38', text: 'Colegio escuela cuota escolaridad chicos', category: 'escuela', amountHint: 115000, isDefault: true },
  { id: 'ml-39', text: 'Librería útiles escolares escuela cuadernos', category: 'escuela', amountHint: 46000, isDefault: true },
  { id: 'ml-40', text: 'Libros texto útiles colegio escuela', category: 'escuela', amountHint: 35000, isDefault: true },
  { id: 'ml-41', text: 'Salida familiar cine chicos familia escuela', category: 'escuela', amountHint: 42000, isDefault: true },
  { id: 'ml-42', text: 'Club actividad chicos familia colegio', category: 'escuela', amountHint: 52000, isDefault: true },

  // Alquiler
  { id: 'ml-43', text: 'Alquiler departamento mensual propietario vivienda', category: 'alquiler', amountHint: 1900000, isDefault: true },
  { id: 'ml-44', text: 'Pago alquiler vivienda transferencia mensual', category: 'alquiler', amountHint: 2052000, isDefault: true },
  { id: 'ml-45', text: 'Alquiler casa contrato vivienda mensual', category: 'alquiler', amountHint: 2216160, isDefault: true },
  { id: 'ml-66', text: 'Transferencia alquiler departamento expensas vivienda', category: 'alquiler', amountHint: 1900000, isDefault: true },

  // Deudas CAPP y Municipalidad
  { id: 'ml-46', text: 'Deuda CAPP plan pagos municipalidad cuota', category: 'deudas', amountHint: 133785, isDefault: true },
  { id: 'ml-47', text: 'Municipalidad moratoria deuda anterior CAPP', category: 'deudas', amountHint: 133785, isDefault: true },
  { id: 'ml-48', text: 'Pago convenio deuda CAPP y Municipalidad', category: 'deudas', amountHint: 133785, isDefault: true },
  { id: 'ml-67', text: 'Cuota deuda municipalidad CAPP mensual', category: 'deudas', amountHint: 133785, isDefault: true },

  // Comisión inmobiliaria
  { id: 'ml-49', text: 'Comisión inmobiliaria renovación contrato', category: 'comision', amountHint: 633333, isDefault: true },
  { id: 'ml-50', text: 'Honorarios inmobiliaria comisión contrato', category: 'comision', amountHint: 633333, isDefault: true },
  { id: 'ml-68', text: 'Pago comisión inmobiliaria cuotas contrato', category: 'comision', amountHint: 633334, isDefault: true },

  // Diferencia de depósito
  { id: 'ml-51', text: 'Diferencia depósito garantía contrato', category: 'deposito', amountHint: 238000, isDefault: true },
  { id: 'ml-52', text: 'Ajuste fondo depósito garantía contrato', category: 'deposito', amountHint: 238000, isDefault: true },
  { id: 'ml-69', text: 'Diferencia depósito garantía renovación', category: 'deposito', amountHint: 238000, isDefault: true },

  // Diezmo
  { id: 'ml-53', text: 'Diezmo iglesia mensual ofrenda', category: 'diezmo', amountHint: 400000, isDefault: true },
  { id: 'ml-54', text: 'Transferencia diezmo congregación iglesia', category: 'diezmo', amountHint: 400000, isDefault: true },
  { id: 'ml-70', text: 'Diezmo iglesia sobre sueldo mensual', category: 'diezmo', amountHint: 400000, isDefault: true },

  // Ahorro programado
  { id: 'ml-55', text: 'Ahorro programado mensual fondo reserva', category: 'ahorro', amountHint: 400000, isDefault: true },
  { id: 'ml-56', text: 'Transferencia caja ahorro fondo reserva', category: 'ahorro', amountHint: 400000, isDefault: true },
  { id: 'ml-71', text: 'Separación ahorro programado reserva mensual', category: 'ahorro', amountHint: 400000, isDefault: true },

  // Ingresos
  { id: 'ml-57', text: 'Sueldo mensual acreditación haberes salario', category: 'sueldo', amountHint: 4000000, isDefault: true },
  { id: 'ml-58', text: 'Recibo de sueldo depósito salario haberes', category: 'sueldo', amountHint: 4000000, isDefault: true },
  { id: 'ml-72', text: 'Cobro sueldo mensual haberes salario', category: 'sueldo', amountHint: 4000000, isDefault: true },
  { id: 'ml-59', text: 'Aporte empresa subsidio alquiler corporativo', category: 'aporte_empresa', amountHint: 1660000, isDefault: true },
  { id: 'ml-60', text: 'Reintegro corporativo empresa aporte alquiler', category: 'aporte_empresa', amountHint: 1660000, isDefault: true },
  { id: 'ml-73', text: 'Aporte empresarial corporativo alquiler mensual', category: 'aporte_empresa', amountHint: 1660000, isDefault: true },
  { id: 'ml-61', text: 'Ingreso extra honorarios proyecto asesoría', category: 'ingreso_extra', amountHint: 700000, isDefault: true },
  { id: 'ml-62', text: 'Cobro honorarios adicional asesoría ingreso extra', category: 'ingreso_extra', amountHint: 700000, isDefault: true },
  { id: 'ml-74', text: 'Honorarios consultoría ingreso extra proyecto', category: 'ingreso_extra', amountHint: 700000, isDefault: true },
  { id: 'ml-63', text: 'Aguinaldo SAC medio sueldo anual complementario', category: 'aguinaldo', amountHint: 2100000, isDefault: true },
  { id: 'ml-64', text: 'Cobro sueldo anual complementario aguinaldo SAC', category: 'aguinaldo', amountHint: 2100000, isDefault: true },
  { id: 'ml-76', text: 'Acreditación aguinaldo SAC julio diciembre', category: 'aguinaldo', amountHint: 2100000, isDefault: true },
  { id: 'ml-65', text: 'Reintegro tarjeta devolución venta particular', category: 'otro_ingreso', amountHint: 85000, isDefault: true },
  { id: 'ml-75', text: 'Venta particular ingreso eventual reintegro', category: 'otro_ingreso', amountHint: 90000, isDefault: true },
  { id: 'ml-77', text: 'Devolución compra reintegro eventual', category: 'otro_ingreso', amountHint: 60000, isDefault: true },
];

const STOPWORDS = new Set([
  'de',
  'la',
  'el',
  'los',
  'las',
  'y',
  'o',
  'en',
  'a',
  'por',
  'para',
  'con',
  'del',
  'al',
  'un',
  'una',
  'unos',
  'unas',
  'pago',
  'compra',
  'cuota',
  'mensual',
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAmountBucket(amount?: number): string | null {
  if (!amount || amount <= 0) return null;
  if (amount < 60000) return '__amt_small__';
  if (amount < 250000) return '__amt_medium__';
  if (amount < 900000) return '__amt_large__';
  return '__amt_xlarge__';
}

export function extractFeatures(text: string, amount?: number): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  const words = norm.split(' ').filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  const features: string[] = [];

  for (const w of words) {
    features.push(`w:${w}`);
    features.push(`w:${w}`);
    features.push(`w:${w}`);
    if (w.length >= 5) {
      features.push(`pre:${w.slice(0, 5)}`);
    }
    if (w.length >= 4) {
      features.push(`c4:${w.slice(0, 4)}`);
    }
  }

  for (let i = 0; i < words.length - 1; i++) {
    features.push(`bi:${words[i]}_${words[i + 1]}`);
    features.push(`bi:${words[i]}_${words[i + 1]}`);
  }

  const bucket = getAmountBucket(amount);
  if (bucket) {
    features.push(bucket);
  }

  return features;
}

export interface PredictionCandidate {
  category: CategoryId;
  probability: number;
}

export interface PredictionResult {
  category: CategoryId;
  confidence: number;
  candidates: PredictionCandidate[];
  matchedSignals: string[];
}

export class SupervisedTransactionClassifier {
  private classDocCounts = new Map<CategoryId, number>();
  private classTokenCounts = new Map<CategoryId, Map<string, number>>();
  private classTotalTokens = new Map<CategoryId, number>();
  private vocabulary = new Set<string>();
  private totalDocs = 0;
  private alpha = 0.15; // Laplace smoothing parameter

  constructor(samples: TrainingSample[]) {
    this.train(samples);
  }

  train(samples: TrainingSample[]): void {
    this.classDocCounts.clear();
    this.classTokenCounts.clear();
    this.classTotalTokens.clear();
    this.vocabulary.clear();
    this.totalDocs = 0;

    for (const sample of samples) {
      const features = extractFeatures(sample.text, sample.amountHint);
      if (features.length === 0) continue;

      this.totalDocs += 1;
      this.classDocCounts.set(
        sample.category,
        (this.classDocCounts.get(sample.category) ?? 0) + 1,
      );

      let tokenMap = this.classTokenCounts.get(sample.category);
      if (!tokenMap) {
        tokenMap = new Map<string, number>();
        this.classTokenCounts.set(sample.category, tokenMap);
      }

      let totalForClass = this.classTotalTokens.get(sample.category) ?? 0;
      for (const feat of features) {
        this.vocabulary.add(feat);
        tokenMap.set(feat, (tokenMap.get(feat) ?? 0) + 1);
        totalForClass += 1;
      }
      this.classTotalTokens.set(sample.category, totalForClass);
    }
  }

  predict(
    text: string,
    amount?: number,
    allowedCategories?: CategoryId[],
  ): PredictionResult {
    const features = extractFeatures(text, amount);
    const categories = allowedCategories ?? Array.from(this.classDocCounts.keys());

    if (categories.length === 0 || features.length === 0) {
      const fallback: CategoryId = categories[0] ?? 'alimentacion';
      return {
        category: fallback,
        confidence: 0,
        candidates: [{ category: fallback, probability: 1 }],
        matchedSignals: [],
      };
    }

    const vocabSize = Math.max(1, this.vocabulary.size);
    const logScores: { category: CategoryId; logProb: number }[] = [];

    // Balanced uniform prior prevents high-count categories from overpowering specialized classes
    const uniformPrior = Math.log(1 / categories.length);

    for (const cat of categories) {
      const tokenMap = this.classTokenCounts.get(cat);
      const totalTokens = this.classTotalTokens.get(cat) ?? 0;
      const denom = totalTokens + this.alpha * vocabSize;

      let score = uniformPrior;
      for (const feat of features) {
        const count = tokenMap?.get(feat) ?? 0;
        score += Math.log((count + this.alpha) / denom);
      }
      logScores.push({ category: cat, logProb: score });
    }

    // Softmax over log-posteriors
    const maxLog = Math.max(...logScores.map((s) => s.logProb));
    const exps = logScores.map((s) => ({
      category: s.category,
      val: Math.exp(s.logProb - maxLog),
    }));
    const sumExp = exps.reduce((acc, item) => acc + item.val, 0) || 1;

    const candidates: PredictionCandidate[] = exps
      .map((item) => ({
        category: item.category,
        probability: item.val / sumExp,
      }))
      .sort((a, b) => b.probability - a.probability);

    const winner = candidates[0];
    const winnerTokenMap = this.classTokenCounts.get(winner.category);
    const matchedSignals = Array.from(
      new Set(
        features
          .filter((f) => f.startsWith('w:') && (winnerTokenMap?.get(f) ?? 0) > 0)
          .map((f) => f.slice(2)),
      ),
    ).slice(0, 4);

    return {
      category: winner.category,
      confidence: winner.probability,
      candidates: candidates.slice(0, 3),
      matchedSignals,
    };
  }

  getVocabularySize(): number {
    return this.vocabulary.size;
  }
}

export function getCategoriesForType(
  type: TransactionType,
  categories?: CategoryMeta[],
): CategoryId[] {
  if (categories && categories.length > 0) {
    return categories.filter((c) => c.type === type).map((c) => c.id);
  }
  if (type === 'income') {
    return ['sueldo', 'aporte_empresa', 'ingreso_extra', 'aguinaldo', 'otro_ingreso'];
  }
  return [
    'alimentacion',
    'servicios',
    'ropa',
    'transporte',
    'salud',
    'escuela',
    'alquiler',
    'deudas',
    'comision',
    'deposito',
    'diezmo',
    'ahorro',
  ];
}

export interface ClassifierMetrics {
  totalSamples: number;
  vocabularySize: number;
  categoryCount: number;
  leaveOneOutAccuracy: number;
}

export function evaluateClassifierLOO(samples: TrainingSample[]): ClassifierMetrics {
  const validSamples = samples.filter((s) => extractFeatures(s.text, s.amountHint).length > 0);
  if (validSamples.length < 5) {
    const clf = new SupervisedTransactionClassifier(validSamples);
    return {
      totalSamples: validSamples.length,
      vocabularySize: clf.getVocabularySize(),
      categoryCount: new Set(validSamples.map((s) => s.category)).size,
      leaveOneOutAccuracy: 0,
    };
  }

  let correct = 0;
  for (let i = 0; i < validSamples.length; i++) {
    const heldOut = validSamples[i];
    const trainSet = validSamples.filter((_, idx) => idx !== i);
    const clf = new SupervisedTransactionClassifier(trainSet);
    const pred = clf.predict(heldOut.text, heldOut.amountHint);
    if (pred.category === heldOut.category) {
      correct += 1;
    }
  }

  const fullClf = new SupervisedTransactionClassifier(validSamples);
  return {
    totalSamples: validSamples.length,
    vocabularySize: fullClf.getVocabularySize(),
    categoryCount: new Set(validSamples.map((s) => s.category)).size,
    leaveOneOutAccuracy: correct / validSamples.length,
  };
}
