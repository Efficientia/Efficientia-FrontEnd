import { apiClient } from '../services/api/client';
import { relatorioService } from '../services/relatorioService';
import type { AnomaliaItemDto, ParadaImprevistaDto, RelatorioViagemResponse } from '../types/relatorio';
import type { CaminhaoRelatorioResponse } from '../types/frota';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const SCALE = 3; // 3x scale (1785x2526) for crisp ~216 DPI print output

const LEFT = 24;
const RIGHT = 571;
const COLUMN = (RIGHT - LEFT) / 2;

const BLUE = '#0E377A';
const BLUE_RGB = { r: 14, g: 55, b: 122 };
const GREEN = '#4DD867';
const LOGO_CREAM = '#FFF8E1';
const LOGO_GREEN = '#56D867';
const INK = '#1F2730';
const BORDER = '#77808B';
const SECTION_BG = '#E6EEF7';

export const SIGNATURE_ROLES = ['pecuarista', 'motorista', 'manobrista', 'curraleiro'] as const;
export type SignatureRole = (typeof SIGNATURE_ROLES)[number];

type SignatureMap = Partial<Record<SignatureRole, HTMLCanvasElement | HTMLImageElement>>;

export interface DownloadRouteReportPdfOptions {
  report?: Partial<RelatorioViagemResponse> | null;
  caminhao?: CaminhaoRelatorioResponse | null;
  pecuaristaNome?: string | null;
  codigoMotorista?: string | null;
}

// ============================================================================
// VETORES EXATOS DO LOGO OFICIAL (logo_effi.xml / efficientia-mark.svg)
// viewportWidth = 138, viewportHeight = 133
// ============================================================================
const LOGO_CREAM_FILL_PATHS = [
  'M106.19,72.31L109.63,68.43V72.31H106.19Z',
  'M31.8,72.32L28.36,68.44V72.32H31.8Z',
  'M31.91,72.31L28.47,68.43V72.31H31.91Z',
  'M106.29,72.32L109.74,68.44V72.32H106.29Z',
];

const LOGO_GREEN_EYE_PATHS = [
  'M48.81,84.58C40.52,82.1 40.31,81.46 40.2,74.78C48.81,79.84 46.66,79.09 48.81,84.58Z',
  'M89.07,84.58C97.36,82.1 97.58,81.46 97.68,74.78C89.07,79.84 91.22,79.09 89.07,84.58Z',
  'M89.29,84.58C97.58,82.1 97.79,81.46 97.9,74.78C89.29,79.84 91.44,79.09 89.29,84.58Z',
];

const LOGO_CREAM_HEAD_STROKES = [
  'M46.06,35.21L45.21,35.21L34.02,57.71M69.46,130.8H56.19L47.79,122.08V116.7L50.59,111.21M50.59,111.21L34.02,80.53V59.11M50.59,111.21L55.65,107.76M34.02,57.71L20.88,50.49L1.94,51.89L8.61,64.27C10.41,66.39 14.9,70.62 18.51,70.62C22.13,70.62 26.48,70.62 28.2,70.62M34.02,57.71V59.11M34.02,59.11L50.81,73.96L55.65,89.25V107.76M55.65,107.76C59.64,108.59 69.12,110.63 69.46,110.63',
  'M45.37,34.96H92.73L103.93,57.45M56.78,130.55H81.75L90.15,121.83V116.44L87.35,110.95M87.35,110.95L103.93,80.28V58.85M87.35,110.95L82.29,107.51M103.93,57.45L117.06,50.24L136.01,51.64L129.33,64.02C127.54,66.14 123.04,70.37 119.43,70.37C115.81,70.37 111.46,70.37 109.74,70.37M103.93,57.45V58.85M103.93,58.85L87.13,73.71L82.29,88.99V107.51M82.29,107.51C78.31,108.33 69.82,110.36 69.47,110.36',
];

const LOGO_CREAM_HORN_STROKES = [
  'M10.79,6.94C10.7,9.54 10.9,12.23 11.66,14.76C12.43,17.32 13.78,19.73 15.98,21.71C18.17,23.67 21.13,25.13 25.01,25.92L44.4,30.67C44.47,30.73 44.57,30.82 44.7,30.95C45.17,31.41 45.97,32.25 47.21,33.7C47.24,33.79 47.51,34.53 46.47,35.86L39.27,44.6L36.81,44.98L16.4,36.31L8.01,26.18V11.52L10.79,6.94Z',
  'M127.09,6.94C127.19,9.54 126.99,12.23 126.23,14.76C125.46,17.32 124.11,19.73 121.9,21.71C119.71,23.67 116.76,25.13 112.88,25.92L93.48,30.67C93.41,30.73 93.32,30.82 93.19,30.95C92.71,31.41 91.92,32.25 90.67,33.7C90.65,33.79 90.38,34.53 91.41,35.86L98.61,44.6L101.08,44.98L121.48,36.31L129.88,26.18V11.52L127.09,6.94Z',
  'M127.31,6.94C127.4,9.54 127.2,12.23 126.44,14.76C125.67,17.32 124.32,19.73 122.12,21.71C119.93,23.67 116.97,25.13 113.09,25.92L93.7,30.67C93.63,30.73 93.53,30.82 93.4,30.95C92.93,31.41 92.13,32.25 90.89,33.7C90.86,33.79 90.59,34.53 91.63,35.86L98.83,44.6L101.29,44.98L121.7,36.31L130.09,26.18V11.52L127.31,6.94Z',
];

const LOGO_GREEN_CIRCUIT_CIRCLES: ReadonlyArray<{ cx: number; cy: number; r: number }> = [
  { cx: 68.62, cy: 59.93, r: 3.12 },
  { cx: 56.56, cy: 50.03, r: 3.12 },
  { cx: 80.89, cy: 50.03, r: 3.12 },
];

function clean(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  return text.toLowerCase() === 'null' ? '' : text;
}

function display(value: unknown): string {
  const text = clean(value);
  return text ? text : '-';
}

function formatDate(value: unknown): string {
  const raw = clean(value);
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`;
  }
  return raw;
}

function formatTime(value: unknown): string {
  const raw = clean(value);
  if (!raw) return '';
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function numberText(value: unknown): string {
  const text = clean(value);
  if (!text) return '0';
  const num = Number(text);
  if (!Number.isFinite(num)) return text;
  return Number.isInteger(num) ? String(Math.round(num)) : String(num);
}

function countInt(value: unknown): number {
  const num = Number(clean(value));
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function normalize(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const OCCURRENCE_TOKENS = [
  'sangr',
  'magrez',
  'cutuc',
  'manc',
  'pisote',
  'cauda',
  'gaiola',
  'chute',
  'arraste',
  'porteira',
  'choque',
  'veiculo',
  'abuso',
];

function mentionsOccurrence(notes: string | null | undefined): boolean {
  const text = normalize(notes);
  if (!text) return false;
  return OCCURRENCE_TOKENS.some((token) => text.includes(token));
}

function hasAnomaly(
  list: AnomaliaItemDto[] | null | undefined,
  notes: string | null | undefined,
  token: string
): boolean {
  if (token === '__empty__') {
    return (!list || list.length === 0) && !mentionsOccurrence(notes);
  }
  if (!token) return false;
  const normalizedToken = normalize(token);
  if (list && list.length > 0) {
    for (const item of list) {
      const text = normalize(`${clean(item.anomalia)} ${clean(item.descricaoOutros)}`);
      if (text.includes(normalizedToken)) return true;
    }
  }
  const normalizedNotes = normalize(notes);
  if (normalizedToken === 'abuso') {
    return (
      normalizedNotes.includes('outros atos de abuso') ||
      normalizedNotes.includes('outro abuso')
    );
  }
  if (normalizedToken === 'outro') return false;
  return normalizedNotes.includes(normalizedToken);
}

function anomalyOther(list: AnomaliaItemDto[] | null | undefined): string {
  if (!list || list.length === 0) return '-';
  const values: string[] = [];
  for (const item of list) {
    const desc = clean(item.descricaoOutros) || clean(item.anomalia);
    if (desc) values.push(desc);
  }
  return values.length === 0 ? '-' : values.join('; ');
}

function stopSummary(list: ParadaImprevistaDto[] | null | undefined): string {
  if (!list || list.length === 0) return '-';
  const firstStop = list[0];
  if (!firstStop) return '-';
  const desc = clean(firstStop.descricaoMotivo);
  const motivo = clean(firstStop.motivo);
  if (desc) return desc;
  if (motivo) return motivo;
  return '-';
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number
) {
  const w = x2 - x1;
  const h = y2 - y1;
  ctx.beginPath();
  ctx.moveTo(x1 + r, y1);
  ctx.lineTo(x1 + w - r, y1);
  ctx.quadraticCurveTo(x1 + w, y1, x1 + w, y1 + r);
  ctx.lineTo(x1 + w, y1 + h - r);
  ctx.quadraticCurveTo(x1 + w, y1 + h, x1 + w - r, y1 + h);
  ctx.lineTo(x1 + r, y1 + h);
  ctx.quadraticCurveTo(x1, y1 + h, x1, y1 + h - r);
  ctx.lineTo(x1, y1 + r);
  ctx.quadraticCurveTo(x1, y1, x1 + r, y1);
  ctx.closePath();
  ctx.fill();
}

/**
 * Renderiza o logotipo oficial da Efficientia (idêntico a R.drawable.logo_effi e efficientia-mark.svg).
 */
function drawLogo(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  right: number,
  bottom: number
) {
  const width = right - left;
  const height = bottom - top;
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(width / 138, height / 133);

  // 1. Preenchimentos creme (#FFF8E1)
  ctx.fillStyle = LOGO_CREAM;
  for (const d of LOGO_CREAM_FILL_PATHS) {
    ctx.fill(new Path2D(d));
  }

  // 2. Olhos verdes (#56D867)
  ctx.fillStyle = LOGO_GREEN;
  ctx.strokeStyle = LOGO_GREEN;
  ctx.lineWidth = 0.215292;
  for (const d of LOGO_GREEN_EYE_PATHS) {
    const p = new Path2D(d);
    ctx.fill(p);
    ctx.stroke(p);
  }

  // 3. Traços principais da cabeça do boi (#FFF8E1)
  ctx.strokeStyle = LOGO_CREAM;
  ctx.lineWidth = 3.87526;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  for (const d of LOGO_CREAM_HEAD_STROKES) {
    ctx.stroke(new Path2D(d));
  }

  // 4. Traços dos chifres (#FFF8E1)
  ctx.strokeStyle = LOGO_CREAM;
  ctx.lineWidth = 3.10021;
  ctx.lineJoin = 'miter';
  for (const d of LOGO_CREAM_HORN_STROKES) {
    ctx.stroke(new Path2D(d));
  }

  // 5. Circuito central e lateral verde (#56D867)
  ctx.strokeStyle = LOGO_GREEN;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.93763;
  ctx.stroke(new Path2D('M68.62,98.25V64.02'));

  ctx.lineWidth = 1.72234;
  ctx.stroke(new Path2D('M63.24,82.1V68.32L56.56,60.57V53.9M74.11,82.1V68.32L80.68,60.57V53.9'));

  // 6. Nós circulares do circuito (#56D867)
  ctx.lineWidth = 1.93763;
  for (const node of LOGO_GREEN_CIRCUIT_CIRCLES) {
    ctx.beginPath();
    ctx.arc(node.cx, node.cy, node.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 7. Narinas verdes (#56D867)
  ctx.lineWidth = 4.95172;
  ctx.lineCap = 'round';
  ctx.stroke(new Path2D('M57.64,118.33L60.33,121.18M79.87,118.33C79.87,118.33 78.16,119.99 77.06,121.06'));
  ctx.stroke(new Path2D('M80.46,118.33L77.77,121.18'));

  ctx.restore();
}

function setFont(ctx: CanvasRenderingContext2D, size: number, bold: boolean, color: string) {
  ctx.font = `${bold ? '700' : '400'} ${size}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
}

function clipText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const raw = text.replace(/\r/g, ' ').replace(/\n/g, ' ').trim();
  if (ctx.measureText(raw).width <= maxWidth) return raw;
  const ellipsis = '…';
  let end = raw.length;
  while (end > 0 && ctx.measureText(raw.slice(0, end) + ellipsis).width > maxWidth) {
    end--;
  }
  return end <= 0 ? ellipsis : raw.slice(0, end) + ellipsis;
}

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const cleaned = clean(text).replace(/\r/g, ' ').replace(/\n/g, ' ').trim();
  if (!cleaned) return;
  const words = cleaned.split(/\s+/);
  let lineText = '';
  let drawn = 0;
  for (const word of words) {
    const candidate = lineText.length === 0 ? word : `${lineText} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      lineText = candidate;
      continue;
    }
    ctx.fillText(clipText(ctx, lineText, maxWidth), x, y + drawn * lineHeight);
    drawn++;
    lineText = word;
    if (drawn >= maxLines - 1) break;
  }
  if (lineText.length > 0 && drawn < maxLines) {
    ctx.fillText(clipText(ctx, lineText, maxWidth), x, y + drawn * lineHeight);
  }
}

function outline(ctx: CanvasRenderingContext2D, left: number, top: number, right: number, bottom: number) {
  ctx.save();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 0.55;
  ctx.strokeRect(left, top, right - left, bottom - top);
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function sectionTitle(ctx: CanvasRenderingContext2D, title: string, top: number, bottom: number) {
  ctx.fillStyle = SECTION_BG;
  ctx.fillRect(LEFT, top, RIGHT - LEFT, bottom - top);
  outline(ctx, LEFT, top, RIGHT, bottom);
  setFont(ctx, 9, true, BLUE);
  const textWidth = ctx.measureText(title).width;
  ctx.fillText(title, LEFT + (RIGHT - LEFT - textWidth) / 2, bottom - 4);
}

function field(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string
) {
  outline(ctx, x, y, x + width, y + 18);
  setFont(ctx, 6.9, true, BLUE);
  ctx.fillText(clipText(ctx, label, width - 8), x + 4, y + 7);
  setFont(ctx, 8.4, false, INK);
  ctx.fillText(clipText(ctx, display(value), width - 8), x + 4, y + 16);
}

function twoFields(
  ctx: CanvasRenderingContext2D,
  y: number,
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string
) {
  field(ctx, LEFT, y, COLUMN, leftLabel, leftValue);
  field(ctx, LEFT + COLUMN, y, COLUMN, rightLabel, rightValue);
}

function fourValues(
  ctx: CanvasRenderingContext2D,
  y: number,
  l1: string,
  v1: string,
  l2: string,
  v2: string,
  l3: string,
  v3: string,
  l4: string,
  v4: string
) {
  const width = (RIGHT - LEFT) / 4;
  field(ctx, LEFT, y, width, l1, v1);
  field(ctx, LEFT + width, y, width, l2, v2);
  field(ctx, LEFT + width * 2, y, width, l3, v3);
  field(ctx, LEFT + width * 3, y, width, l4, v4);
}

function checkboxRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  anomalies: AnomaliaItemDto[] | null | undefined,
  notes: string | null | undefined,
  l1: string,
  t1: string,
  l2: string,
  t2: string,
  l3: string,
  t3: string
) {
  const width = (RIGHT - LEFT) / 3;
  checkboxCell(ctx, LEFT, y, width, l1, hasAnomaly(anomalies, notes, t1));
  checkboxCell(ctx, LEFT + width, y, width, l2, hasAnomaly(anomalies, notes, t2));
  checkboxCell(ctx, LEFT + width * 2, y, width, l3, t3 ? hasAnomaly(anomalies, notes, t3) : false);
}

function checkboxCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  checked: boolean
) {
  outline(ctx, x, y, x + width, y + 19);
  if (!label) return;
  outline(ctx, x + 5, y + 5, x + 14, y + 14);
  if (checked) {
    setFont(ctx, 9, true, BLUE);
    ctx.fillText('X', x + 6.5, y + 13);
  }
  setFont(ctx, 7.7, false, INK);
  ctx.fillText(clipText(ctx, label, width - 23), x + 19, y + 13);
}

/**
 * Recorta a área útil da assinatura e aplica coloração azul (#0E377A) idêntica ao
 * PorterDuffColorFilter(BLUE, PorterDuff.Mode.SRC_IN) de RouteReportFormPdf.java.
 *
 * No aplicativo mobile (SignaturePadView.java), os traços são desenhados em BRANCO (#FFFFFF)
 * sobre fundo transparente (alpha = 0). Portanto:
 * - Se a imagem possui fundo transparente, qualquer pixel com alpha >= 24 é traço da assinatura.
 * - Se a imagem possui fundo branco opaco, pixels não-brancos (r < 245 || g < 245 || b < 245) são traço.
 */
export function extractInkCroppedTintedSignature(
  img: HTMLImageElement | HTMLCanvasElement
): HTMLCanvasElement | null {
  const w = img.width;
  const h = img.height;
  if (w <= 0 || h <= 0) return null;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return null;

  tempCtx.drawImage(img, 0, 0);
  let imageData: ImageData;
  try {
    imageData = tempCtx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }

  const data = imageData.data;
  const totalPixels = w * h;
  let transparentPixels = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 24) {
      transparentPixels++;
    }
  }
  // Se ao menos 5% da imagem é transparente, trata-se de PNG com fundo transparente (como no app mobile)
  const hasTransparentBackground = transparentPixels > totalPixels * 0.05;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const idx = (py * w + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      const isInk = hasTransparentBackground
        ? a >= 24
        : a >= 24 && (r < 245 || g < 245 || b < 245);

      if (isInk) {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
        // Aplica PorterDuff.Mode.SRC_IN com BLUE (#0E377A), preservando o canal alpha original
        data[idx] = BLUE_RGB.r;
        data[idx + 1] = BLUE_RGB.g;
        data[idx + 2] = BLUE_RGB.b;
      } else {
        data[idx + 3] = 0;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  tempCtx.putImageData(imageData, 0, 0);

  // Margem de 3px idêntica a RouteReportFormPdf.inkBounds
  const cropLeft = Math.max(0, minX - 3);
  const cropTop = Math.max(0, minY - 3);
  const cropRight = Math.min(w, maxX + 4);
  const cropBottom = Math.min(h, maxY + 4);
  const cropW = Math.max(1, cropRight - cropLeft);
  const cropH = Math.max(1, cropBottom - cropTop);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return null;

  croppedCtx.drawImage(tempCanvas, cropLeft, cropTop, cropW, cropH, 0, 0, cropW, cropH);
  return croppedCanvas;
}

/**
 * Desenha o quadro de assinatura exatamente como RouteReportFormPdf.signature:
 * - Imagem recortada e tingida em #0E377A centralizada na área superior
 * - Linha horizontal em top + height - 22
 * - Rótulo abaixo da linha em top + height - 8
 */
function drawSignatureBox(
  ctx: CanvasRenderingContext2D,
  signatures: SignatureMap,
  role: SignatureRole,
  label: string,
  x: number,
  top: number,
  width: number,
  height: number
) {
  outline(ctx, x, top, x + width, top + height);

  const rawSignature = signatures[role];
  if (rawSignature) {
    const cropped = extractInkCroppedTintedSignature(rawSignature) || rawSignature;
    if (cropped.width > 0 && cropped.height > 0) {
      const availableWidth = Math.max(1, width - 22);
      const availableHeight = Math.max(1, height - 34);
      const scale = Math.min(availableWidth / cropped.width, availableHeight / cropped.height);
      const imageWidth = Math.max(1, cropped.width * scale);
      const imageHeight = Math.max(1, cropped.height * scale);
      const left = x + (width - imageWidth) / 2;
      const imageTop = top + 3 + (availableHeight - imageHeight) / 2;
      ctx.drawImage(cropped, left, imageTop, imageWidth, imageHeight);
    }
  }

  line(ctx, x + 10, top + height - 22, x + width - 10, top + height - 22);
  setFont(ctx, 8.3, false, INK);
  ctx.fillText(clipText(ctx, label, width - 14), x + 7, top + height - 8);
}

export function renderRouteReportCanvas(
  report: Partial<RelatorioViagemResponse>,
  signatures: SignatureMap = {},
  extra?: {
    caminhao?: CaminhaoRelatorioResponse | null;
    pecuaristaNome?: string | null;
    codigoMotorista?: string | null;
  }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH * SCALE;
  canvas.height = PAGE_HEIGHT * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível inicializar o renderizador 2D para o PDF.');
  }

  ctx.save();
  ctx.scale(SCALE, SCALE);

  // Fundo branco da página A4
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  // 1. HEADER (exatamente como RouteReportFormPdf.header)
  ctx.fillStyle = BLUE;
  drawRoundedRect(ctx, LEFT, 22, RIGHT, 77, 5);
  drawLogo(ctx, 32, 26, 78, 72);

  setFont(ctx, 18, true, '#FFFFFF');
  const brandPrefix = 'Efficient';
  ctx.fillText(brandPrefix, 82, 49);
  const prefixWidth = ctx.measureText(brandPrefix).width;
  setFont(ctx, 18, true, GREEN);
  ctx.fillText('ia', 82 + prefixWidth, 49);

  setFont(ctx, 10, true, '#FFFFFF');
  ctx.fillText('RELATÓRIO DE EMBARQUE E DESEMBARQUE', 82, 66);

  setFont(ctx, 8, false, '#FFFFFF');
  ctx.fillText(`Nº ${display(report.id)}`, RIGHT - 61, 38);

  // 2. DADOS DA VIAGEM (exatamente como RouteReportFormPdf.details)
  const placaCavalo =
    clean((report as Record<string, unknown>).placaCavalo) ||
    clean(extra?.caminhao?.placaCavalo) ||
    clean(extra?.caminhao?.cavalo?.placa);
  const placaCarreta =
    clean((report as Record<string, unknown>).placaCarreta) ||
    clean(extra?.caminhao?.placaCarreta) ||
    clean(extra?.caminhao?.carreta?.placa);

  const pecuarista =
    clean(extra?.pecuaristaNome) ||
    clean((report as Record<string, unknown>).nomePecuarista) ||
    clean((report as Record<string, unknown>).pecuaristaNome);
  const codigoMotorista =
    clean(extra?.codigoMotorista) ||
    clean((report as Record<string, unknown>).codigoMotorista) ||
    clean(report.motoristaId);

  sectionTitle(ctx, 'DADOS DA VIAGEM', 78, 96);
  twoFields(
    ctx,
    96,
    'Fazenda / origem',
    clean(report.nomeOrigem) || clean(report.fazendaId),
    'Unidade / destino',
    clean(report.nomeDestino) || clean(report.unidadeFrigorificaId)
  );
  twoFields(ctx, 114, 'Nome pecuarista', pecuarista, 'Código motorista', codigoMotorista);
  twoFields(ctx, 132, 'Placa cavalo', placaCavalo, 'Placa carreta', placaCarreta);
  twoFields(
    ctx,
    150,
    'Data de embarque',
    formatDate(report.dataEmbarque),
    'Horário de embarque',
    formatTime(report.horarioEmbarque)
  );
  twoFields(
    ctx,
    168,
    'Saída da propriedade',
    formatTime(report.horarioSaidaPropriedade),
    'Nº nota fiscal',
    clean(report.numeroNotaFiscal)
  );
  twoFields(ctx, 186, 'Nº GTA', clean(report.numeroGta), 'Km saída do embarcadouro', clean(report.kmSaidaEmbarcadouro));

  // 3. ANIMAIS / EMBARQUE (exatamente como RouteReportFormPdf.loadingAnimals)
  sectionTitle(ctx, 'ANIMAIS / EMBARQUE', 204, 221);
  const machos = clean(report.quantidadeMachos);
  const femeas = clean(report.quantidadeFemeas);
  const marrucos = clean(report.quantidadeMarrucos);
  const totalRaw = clean(report.totalAnimais);
  const total =
    totalRaw.length > 0
      ? totalRaw
      : machos || femeas || marrucos
        ? String(countInt(machos) + countInt(femeas) + countInt(marrucos))
        : '';
  fourValues(ctx, 221, 'Machos', machos, 'Fêmeas', femeas, 'Marrucos', marrucos, 'Total', total);

  // 4. INFORMAÇÕES EMBARQUE (exatamente como RouteReportFormPdf.loadingInformation)
  sectionTitle(ctx, 'INFORMAÇÕES EMBARQUE', 239, 255);
  const loadingAnomalies = report.anomaliasEmbarque || [];
  const notes = report.comentarios || '';
  checkboxRow(
    ctx,
    255,
    loadingAnomalies,
    notes,
    'Animal sangrando',
    'sangr',
    'Excesso de magreza',
    'magrez',
    'Cutucões fortes',
    'cutuc'
  );
  checkboxRow(
    ctx,
    274,
    loadingAnomalies,
    notes,
    'Animal mancando',
    'manc',
    'Animal sujo / pisoteio',
    'pisote',
    'Quebra da cauda',
    'cauda'
  );
  checkboxRow(
    ctx,
    293,
    loadingAnomalies,
    notes,
    'Gaiola muito cheia',
    'gaiola',
    'Chute / paulada / ferrão',
    'chute',
    'Arraste',
    'arraste'
  );
  checkboxRow(ctx, 312, loadingAnomalies, notes, 'Nenhum', '__empty__', 'Outro', 'outro', '', '');
  drawSignatureBox(ctx, signatures, 'pecuarista', 'Assinatura do responsável (fazenda)', LEFT, 331, RIGHT - LEFT, 53);

  // 5. INFORMAÇÕES VIAGEM (exatamente como RouteReportFormPdf.tripInformation)
  sectionTitle(ctx, 'INFORMAÇÕES VIAGEM', 384, 400);
  const stops = report.paradasImprevistas || [];
  const hadStop = stops.length > 0 ? 'Sim' : 'Não';
  field(ctx, LEFT, 400, 131, 'Parada imprevista?', hadStop);
  field(ctx, LEFT + 131, 400, RIGHT - LEFT - 131, 'Motivo / descrição', stopSummary(stops));
  twoFields(
    ctx,
    418,
    'Data de chegada na unidade',
    formatDate(report.dataChegadaUnidade),
    'Horário de chegada',
    formatTime(report.horarioChegadaUnidade)
  );
  twoFields(
    ctx,
    436,
    'Km chegada desembarcadouro',
    clean(report.kmChegadaDesembarcadouro),
    'Horário de desembarque',
    formatTime(report.horarioDesembarque)
  );

  // 6. INFORMAÇÕES DESEMBARQUE (exatamente como RouteReportFormPdf.unloadingInformation)
  sectionTitle(ctx, 'INFORMAÇÕES DESEMBARQUE', 454, 470);
  const unloadingAnomalies = report.anomaliasDesembarque || [];
  checkboxRow(
    ctx,
    470,
    unloadingAnomalies,
    notes,
    'Gaiola danificada',
    'gaiola',
    'Porteiras não abrem',
    'porteira',
    'Uso abusivo de choque',
    'choque'
  );
  checkboxRow(
    ctx,
    489,
    unloadingAnomalies,
    notes,
    'Problema no veículo',
    'veiculo',
    'Outros atos de abuso',
    'abuso',
    'Nenhum',
    '__empty__'
  );
  const sireneRaw = report.sireneReFuncionou;
  const sirene =
    sireneRaw === null || sireneRaw === undefined
      ? ''
      : sireneRaw
        ? 'Sim'
        : 'Não';
  field(ctx, LEFT, 508, 170, 'Nº curral', clean(report.numeroCurral));
  field(ctx, LEFT + 170, 508, RIGHT - LEFT - 170, 'Sirene de ré funcionou?', sirene);
  field(ctx, LEFT, 526, RIGHT - LEFT, 'Outras anomalias', anomalyOther(unloadingAnomalies));

  // 7. INFORMAÇÕES ANIMAIS (exatamente como RouteReportFormPdf.animalCondition)
  sectionTitle(ctx, 'INFORMAÇÕES ANIMAIS', 544, 560);
  fourValues(
    ctx,
    560,
    'Em pé',
    numberText(report.quantidadeEmPe),
    'Deitados',
    numberText(report.quantidadeDeitado),
    'Mortos',
    numberText(report.quantidadeMorto),
    'Emergência',
    numberText(report.quantidadeEmergencia)
  );
  field(ctx, LEFT, 578, RIGHT - LEFT, 'Motivo da emergência', clean(report.motivoEmergencia));

  // 8. COMENTÁRIOS E OBSERVAÇÕES (exatamente como RouteReportFormPdf.comments)
  sectionTitle(ctx, 'COMENTÁRIOS E OBSERVAÇÕES', 596, 612);
  outline(ctx, LEFT, 612, RIGHT, 660);
  setFont(ctx, 10, false, INK);
  drawWrapped(ctx, clean(report.comentarios), LEFT + 6, 626, RIGHT - LEFT - 12, 13, 3);

  // 9. ASSINATURAS INFERIORES (exatamente como RouteReportFormPdf.draw)
  drawSignatureBox(ctx, signatures, 'motorista', 'Assinatura do motorista', LEFT, 660, 182, 134);
  drawSignatureBox(ctx, signatures, 'manobrista', 'Assinatura do manobrista', LEFT + 182, 660, 182, 134);
  drawSignatureBox(ctx, signatures, 'curraleiro', 'Assinatura do recebedor (curraleiro)', LEFT + 364, 660, 183, 134);

  // 10. FOOTER (exatamente como RouteReportFormPdf.footer)
  line(ctx, LEFT, 802, RIGHT, 802);
  setFont(ctx, 7.5, false, BORDER);
  ctx.fillText('Relatório Efficientia • Documento gerado a partir dos dados do diário de rota.', LEFT + 4, 814);
  ctx.fillText(`ID ${display(report.id)}`, RIGHT - 57, 814);

  ctx.restore();
  return canvas;
}

async function decodeBlobToImage(blob: Blob): Promise<HTMLImageElement | null> {
  if (!blob || blob.size === 0) return null;
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchSignatureImage(
  reportId: number,
  role: SignatureRole,
  directUrl?: string | null,
  motoristaId?: number | null
): Promise<HTMLImageElement | null> {
  const candidates: string[] = [];

  if (directUrl && directUrl.trim()) {
    const trimmed = directUrl.trim();
    // Ignora caminhos locais do Android (ex: /data/user/0/...) que não são rotas HTTP/API
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('http') || trimmed.startsWith('/api/')) {
      candidates.push(trimmed);
    }
  }

  // Endpoint principal da API (plural 'assinaturas', idêntico a RouteDiaryService.java linha 37)
  candidates.push(`/api/v1/relatorios-viagem/${reportId}/assinaturas/${role}/conteudo`);
  // Fallback singular caso alguma versão do backend exponha no singular
  candidates.push(`/api/v1/relatorios-viagem/${reportId}/assinatura/${role}/conteudo`);

  // Para o motorista, caso a assinatura fixa esteja vinculada ao perfil do usuário (DriverSignatureService)
  if (role === 'motorista') {
    if (typeof motoristaId === 'number' && motoristaId > 0) {
      candidates.push(`/api/v1/usuarios/${motoristaId}/assinatura/conteudo`);
    }
    candidates.push('/api/v1/usuarios/me/assinatura/conteudo');
  }

  const visited = new Set<string>();
  for (const url of candidates) {
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      if (url.startsWith('data:image/')) {
        const res = await fetch(url);
        const blob = await res.blob();
        const decoded = await decodeBlobToImage(blob);
        if (decoded) return decoded;
        continue;
      }
      const response = await apiClient.get<Blob>(url, {
        responseType: 'blob',
      });
      const decoded = await decodeBlobToImage(response.data);
      if (decoded) return decoded;
    } catch {
      // Tenta próximo candidato silenciosamente (igual ao RouteReportPdf.java)
    }
  }
  return null;
}

export async function loadSignatures(report: Partial<RelatorioViagemResponse>): Promise<SignatureMap> {
  const signatures: SignatureMap = {};
  const reportId = report.id;
  if (!reportId) return signatures;

  const roleUrlMap: Record<SignatureRole, string | null | undefined> = {
    pecuarista: report.urlAssinaturaPecuarista,
    motorista: report.urlAssinaturaMotorista,
    manobrista: report.urlAssinaturaManobrista,
    curraleiro: report.urlAssinaturaCurraleiro,
  };

  await Promise.all(
    SIGNATURE_ROLES.map(async (role) => {
      const img = await fetchSignatureImage(reportId, role, roleUrlMap[role], report.motoristaId);
      if (img) {
        signatures[role] = img;
      }
    })
  );

  return signatures;
}

/**
 * Carrega as 4 assinaturas autenticadas via JWT, recorta e aplica a tinta azul (#0E377A)
 * sobre os traços brancos do mobile, devolvendo Data URLs prontas para exibição no modal web.
 */
export async function loadSignatureDataUrls(
  report: Partial<RelatorioViagemResponse>
): Promise<Partial<Record<SignatureRole, string>>> {
  const rawMap = await loadSignatures(report);
  const result: Partial<Record<SignatureRole, string>> = {};

  for (const role of SIGNATURE_ROLES) {
    const raw = rawMap[role];
    if (!raw) continue;
    const tinted = extractInkCroppedTintedSignature(raw);
    if (tinted) {
      result[role] = tinted.toDataURL('image/png');
    } else if (raw instanceof HTMLCanvasElement) {
      result[role] = raw.toDataURL('image/png');
    }
  }

  return result;
}

function buildSinglePageJpegPdf(jpegBytes: Uint8Array, pixelWidth: number, pixelHeight: number): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let currentLength = 0;

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentLength += bytes.byteLength;
  };

  const pushText = (text: string) => {
    pushBytes(encoder.encode(text));
  };

  const startObject = (objNum: number) => {
    offsets[objNum] = currentLength;
    pushText(`${objNum} 0 obj\n`);
  };

  const endObject = () => {
    pushText('endobj\n');
  };

  // PDF 1.4 Header com marcador binário
  pushBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // Obj 1: Catalog
  startObject(1);
  pushText('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObject();

  // Obj 2: Pages
  startObject(2);
  pushText('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  endObject();

  // Obj 3: Page (A4 595 x 842 pt)
  startObject(3);
  pushText(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n`
  );
  endObject();

  // Obj 4: Image XObject (DCTDecode JPEG)
  startObject(4);
  pushText(
    `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushText('\nendstream\n');
  endObject();

  // Obj 5: Content Stream
  const contentStream = `q\n${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);
  startObject(5);
  pushText(`<< /Length ${contentBytes.byteLength} >>\nstream\n`);
  pushBytes(contentBytes);
  pushText('endstream\n');
  endObject();

  // Xref Table
  const xrefOffset = currentLength;
  const totalObjects = 6;
  pushText(`xref\n0 ${totalObjects}\n`);
  pushText('0000000000 65535 f \n');
  for (let i = 1; i < totalObjects; i++) {
    const offsetStr = String(offsets[i]).padStart(10, '0');
    pushText(`${offsetStr} 00000 n \n`);
  }

  // Trailer
  pushText(`trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const output = new Uint8Array(currentLength);
  let pos = 0;
  for (const chunk of chunks) {
    output.set(chunk, pos);
    pos += chunk.byteLength;
  }
  return output;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf(';base64,');
  if (base64Index === -1) {
    throw new Error('Formato de imagem inválido ao gerar o PDF.');
  }
  const base64 = dataUrl.slice(base64Index + 8);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function downloadRouteReportPdf(
  reportId: number,
  options?: DownloadRouteReportPdfOptions
): Promise<void> {
  let mergedReport: Partial<RelatorioViagemResponse> = {
    ...(options?.report || {}),
    id: reportId,
  };
  let caminhao: CaminhaoRelatorioResponse | null = options?.caminhao || null;

  const [reportResult, caminhaoResult] = await Promise.allSettled([
    relatorioService.buscarPorId(reportId),
    caminhao ? Promise.resolve(caminhao) : relatorioService.buscarCaminhao(reportId),
  ]);

  if (reportResult.status === 'fulfilled' && reportResult.value) {
    mergedReport = {
      ...mergedReport,
      ...reportResult.value,
      nomeOrigem: reportResult.value.nomeOrigem || mergedReport.nomeOrigem,
      nomeDestino: reportResult.value.nomeDestino || mergedReport.nomeDestino,
    };
  }

  if (caminhaoResult.status === 'fulfilled' && caminhaoResult.value) {
    caminhao = caminhaoResult.value;
  }

  const signatures = await loadSignatures(mergedReport);
  const canvas = renderRouteReportCanvas(mergedReport, signatures, {
    caminhao,
    pecuaristaNome: options?.pecuaristaNome,
    codigoMotorista: options?.codigoMotorista,
  });

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
  const pdfBytes = buildSinglePageJpegPdf(jpegBytes, canvas.width, canvas.height);

  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `diario-rota-${reportId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
