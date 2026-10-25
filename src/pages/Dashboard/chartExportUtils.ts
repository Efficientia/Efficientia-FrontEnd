import type { ChartDayBar } from './dashboardMetrics';

export interface ChartExportOptions {
  readonly title: string;
  readonly subtitle?: string;
  readonly unit: string;
  readonly bars: readonly ChartDayBar[];
  readonly ceiling: number;
  readonly colorScheme: 'blue' | 'green' | 'red' | 'orange';
  readonly isDarkMode: boolean;
  readonly period?: string;
  readonly yAxisSteps?: readonly number[];
}

/**
 * Converte o nome para slug seguro de arquivo
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Exporta os dados do gráfico para CSV formatado com BOM UTF-8
 */
export function exportChartToCsv(
  title: string,
  bars: readonly ChartDayBar[],
  unit: string,
  period = 'Esta semana'
): void {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR');
  const total = bars.reduce((acc, b) => acc + (Number(b.value) || 0), 0);
  const average = bars.length > 0 ? Math.round(total / bars.length) : 0;
  const maxBar = bars.reduce((max, b) => (b.value > max.value ? b : max), bars[0] ?? { day: '-', value: 0 });

  const dayNames: Record<string, string> = {
    Dom: 'Domingo',
    Seg: 'Segunda-feira',
    Ter: 'Terça-feira',
    Qua: 'Quarta-feira',
    Qui: 'Quinta-feira',
    Sex: 'Sexta-feira',
    Sáb: 'Sábado',
  };

  const lines: string[] = [
    `# EFFICIENTIA - EXPORTAÇÃO DE DADOS OPERACIONAIS`,
    `# Indicador:;${title}`,
    `# Período:;${period}`,
    `# Unidade de Medida:;${unit}`,
    `# Data de Extração:;${dateFormatted} às ${timeFormatted}`,
    `# Total da Semana:;${total.toLocaleString('pt-BR')} ${unit}`,
    `# Média Diária:;${average.toLocaleString('pt-BR')} ${unit}/dia`,
    `# Dia de Pico:;${dayNames[maxBar?.day ?? ''] ?? maxBar?.day} (${maxBar?.value.toLocaleString('pt-BR')} ${unit})`,
    '',
    'Dia Abreviado;Dia Completo;Valor Registrado;Unidade;Percentual Semanal;Destaque Operacional',
  ];

  bars.forEach((bar) => {
    const fullDay = dayNames[bar.day] ?? bar.day;
    const pct = total > 0 ? ((bar.value / total) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
    const highlightText = bar.highlight ? 'Pico / Hoje' : 'Regular';
    lines.push(
      `"${bar.day}";"${fullDay}";${bar.value};"${unit}";"${pct}";"${highlightText}"`
    );
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const dateSlug = now.toISOString().slice(0, 10);
  anchor.download = `efficientia_${slugify(title)}_${dateSlug}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Desenha um retângulo com cantos arredondados no Canvas
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl?: number; tr?: number; br?: number; bl?: number }
) {
  const isNum = typeof radius === 'number';
  const tl = isNum ? radius : (radius.tl ?? 0);
  const tr = isNum ? radius : (radius.tr ?? 0);
  const br = isNum ? radius : (radius.br ?? 0);
  const bl = isNum ? radius : (radius.bl ?? 0);

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  ctx.lineTo(x + bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/**
 * Exporta um recorte de imagem PNG em alta resolução dos dados do momento.
 * Execução síncrona e instantânea via toDataURL.
 */
export function exportChartToPng(options: ChartExportOptions): void {
  const {
    title,
    subtitle,
    unit,
    bars,
    ceiling,
    colorScheme,
    isDarkMode,
    period = 'Esta semana',
    yAxisSteps,
  } = options;

  const scale = 2; // Supersampling 2x para nitidez Retina / 4K
  const width = 1080;
  const height = 660;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível obter o contexto 2D do Canvas');
  }

  ctx.scale(scale, scale);

  // Cores por tema
  const bgCard = isDarkMode ? '#0E2545' : '#FFFFFF';
  const bgOuter = isDarkMode ? '#071329' : '#D8DEEB';
  const borderColor = isDarkMode ? '#294F7A' : '#E2E8F4';
  const textPrimary = isDarkMode ? '#F2F7FF' : '#1E232D';
  const textSecondary = isDarkMode ? '#ABBFDB' : '#64748B';
  const textMuted = isDarkMode ? '#6C8BB5' : '#94A3B8';
  const gridColor = isDarkMode ? 'rgba(41, 79, 122, 0.45)' : 'rgba(226, 232, 244, 0.9)';
  const trackBg = isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9';

  // Cor primária das barras
  let barColor = isDarkMode ? '#2E7AE6' : '#0F51AE';
  if (colorScheme === 'red') barColor = '#F41F2E';
  if (colorScheme === 'orange') barColor = '#FF9E0E';
  if (colorScheme === 'green') barColor = '#56D867';
  const highlightColor = '#56D867';

  // 1. Fundo externo
  ctx.fillStyle = bgOuter;
  ctx.fillRect(0, 0, width, height);

  // 2. Card principal arredondado com sombra
  const cardPadding = 24;
  const cardX = cardPadding;
  const cardY = cardPadding;
  const cardW = width - cardPadding * 2;
  const cardH = height - cardPadding * 2;

  ctx.save();
  ctx.shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(15, 35, 75, 0.12)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = bgCard;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.restore();

  // Borda do card
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.stroke();

  // 3. Cabeçalho do Card
  const innerX = cardX + 28;
  const innerW = cardW - 56;
  let curY = cardY + 36;

  // Tag de marca "EFFICIENTIA"
  ctx.font = '700 11px Montserrat, sans-serif';
  ctx.fillStyle = '#56D867';
  ctx.fillText('EFFICIENTIA • RECORTE OPERACIONAL', innerX, curY);

  // Carimbo de data/hora no canto direito
  const now = new Date();
  const timeStampStr = `Extraído em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
  ctx.font = '500 11px Montserrat, sans-serif';
  ctx.fillStyle = textMuted;
  ctx.textAlign = 'right';
  ctx.fillText(timeStampStr, innerX + innerW, curY);
  ctx.textAlign = 'left';

  curY += 26;

  // Título do Gráfico
  ctx.font = '800 24px Montserrat, sans-serif';
  ctx.fillStyle = textPrimary;
  ctx.fillText(title, innerX, curY);

  // Badge do período no canto direito
  const badgeText = period;
  ctx.font = '600 12px Montserrat, sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 24;
  const badgeHeight = 26;
  const badgeX = innerX + innerW - badgeWidth;
  const badgeY = curY - 20;

  ctx.fillStyle = isDarkMode ? 'rgba(46, 122, 230, 0.2)' : '#E9F1FE';
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 13);
  ctx.fill();
  ctx.fillStyle = isDarkMode ? '#85B8FF' : '#0F51AE';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 17);
  ctx.textAlign = 'left';

  curY += 18;

  // Subtítulo descritivo
  ctx.font = '500 13px Montserrat, sans-serif';
  ctx.fillStyle = textSecondary;
  const sub = subtitle || `Distribuição diária consolidada em ${unit} • Escala máxima: ${ceiling.toLocaleString('pt-BR')}`;
  ctx.fillText(sub, innerX, curY);

  curY += 22;

  // Divisor sutil
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX, curY);
  ctx.lineTo(innerX + innerW, curY);
  ctx.stroke();

  // 4. Área de plotagem do gráfico
  const plotY = curY + 28;
  const plotH = 260;
  const yAxisWidth = 60;
  const plotX = innerX + yAxisWidth;
  const chartWidth = innerW - yAxisWidth;

  // Linhas de grade e valores do eixo Y
  const steps = yAxisSteps && yAxisSteps.length > 0
    ? [...yAxisSteps].sort((a, b) => b - a)
    : [ceiling, Math.round(ceiling * 0.66), Math.round(ceiling * 0.33), 0];

  steps.forEach((stepVal) => {
    const ratio = ceiling > 0 ? stepVal / ceiling : 0;
    const lineY = plotY + plotH - ratio * plotH;

    // Linha de grade
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX - 10, lineY);
    ctx.lineTo(plotX + chartWidth, lineY);
    ctx.stroke();

    // Rótulo do eixo Y
    ctx.font = '600 11px Montserrat, sans-serif';
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'right';
    ctx.fillText(stepVal.toLocaleString('pt-BR'), plotX - 16, lineY + 4);
  });

  // 5. Desenho das Barras e Rótulos
  const barCount = bars.length;
  const slotWidth = chartWidth / barCount;
  const maxBarWidth = Math.min(52, slotWidth * 0.58);

  bars.forEach((bar, index) => {
    const slotCenterX = plotX + index * slotWidth + slotWidth / 2;
    const barLeft = slotCenterX - maxBarWidth / 2;
    const barHeight = ceiling > 0 ? Math.max(4, (bar.value / ceiling) * plotH) : 4;
    const barTop = plotY + plotH - barHeight;

    // Track de fundo sutil
    ctx.fillStyle = trackBg;
    drawRoundedRect(ctx, barLeft, plotY, maxBarWidth, plotH, { tl: 8, tr: 8, bl: 0, br: 0 });
    ctx.fill();

    // Barra colorida
    const isHl = Boolean(bar.highlight);
    ctx.fillStyle = isHl ? highlightColor : barColor;

    // Se for destacada, adicionar brilho
    if (isHl) {
      ctx.save();
      ctx.shadowColor = 'rgba(86, 216, 103, 0.45)';
      ctx.shadowBlur = 12;
    }

    drawRoundedRect(ctx, barLeft, barTop, maxBarWidth, barHeight, { tl: 8, tr: 8, bl: 0, br: 0 });
    ctx.fill();

    if (isHl) {
      ctx.restore();
    }

    // RÓTULO DO VALOR (em cima da barra)
    ctx.font = isHl ? '700 13px Montserrat, sans-serif' : '600 12px Montserrat, sans-serif';
    ctx.fillStyle = isHl ? highlightColor : textPrimary;
    ctx.textAlign = 'center';

    const labelText = bar.value.toLocaleString('pt-BR');
    const textY = barTop - 8 < plotY - 4 ? barTop + 18 : barTop - 8;
    if (textY > barTop) {
      ctx.fillStyle = isHl ? '#09264D' : '#FFFFFF';
    }
    ctx.fillText(labelText, slotCenterX, textY);

    // RÓTULO DO DIA (embaixo da linha base)
    ctx.font = isHl ? '700 12px Montserrat, sans-serif' : '500 12px Montserrat, sans-serif';
    ctx.fillStyle = isHl ? (isDarkMode ? '#56D867' : '#0F51AE') : textSecondary;
    ctx.fillText(bar.day, slotCenterX, plotY + plotH + 20);
  });

  // 6. Linha base do gráfico
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotX - 10, plotY + plotH);
  ctx.lineTo(plotX + chartWidth, plotY + plotH);
  ctx.stroke();

  // 7. Rodapé com Métricas Consolidadas
  const footerY = plotY + plotH + 46;
  const totalVal = bars.reduce((acc, b) => acc + (Number(b.value) || 0), 0);
  const avgVal = bars.length > 0 ? Math.round(totalVal / bars.length) : 0;
  const peakBar = bars.reduce((max, b) => (b.value > max.value ? b : max), bars[0] ?? { day: '-', value: 0 });

  // Box do resumo
  ctx.fillStyle = isDarkMode ? '#0B1E38' : '#F8FAFC';
  drawRoundedRect(ctx, innerX, footerY, innerW, 46, 10);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, innerX, footerY, innerW, 46, 10);
  ctx.stroke();

  // Texto consolidado no rodapé
  ctx.font = '600 12px Montserrat, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = textPrimary;
  const fText = `TOTAL SEMANAL: ${totalVal.toLocaleString('pt-BR')} ${unit}   •   MÉDIA DIÁRIA: ${avgVal.toLocaleString('pt-BR')} ${unit}/dia   •   PICO: ${peakBar.day} (${peakBar.value.toLocaleString('pt-BR')} ${unit})`;
  ctx.fillText(fText, innerX + 16, footerY + 28);

  // Marca d'água no rodapé direito
  ctx.textAlign = 'right';
  ctx.font = '700 11px Montserrat, sans-serif';
  ctx.fillStyle = '#56D867';
  ctx.fillText('EFFICIENTIA SYSTEM', innerX + innerW - 16, footerY + 28);

  // Download imediato via data URL
  const dateSlug = now.toISOString().slice(0, 10);
  const fileName = `efficientia_${slugify(title)}_recorte_${dateSlug}.png`;
  const dataUrl = canvas.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
