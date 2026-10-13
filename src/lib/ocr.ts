import { createWorker, PSM } from 'tesseract.js';
import { pdfjsLib } from '@/lib/pdfjs';

export interface OcrProgress {
  page: number;
  totalPages: number;
  progress: number;
  label: string;
}

const RENDER_SCALE = 4;

const isPdfFile = (file: File): boolean =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

const loadImageToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
      element.src = url;
    });

    const scale = Math.max(1, Math.min(4, 2400 / image.naturalWidth));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível criar o canvas para OCR.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const renderPageToCanvas = async (
  page: Awaited<ReturnType<Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>['getPage']>>,
): Promise<HTMLCanvasElement> => {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível criar o canvas para OCR.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
};

/**
 * Reads an image or a scanned PDF using OCR (Tesseract) and returns the
 * recognized lines, ready to be parsed by the transaction extractor.
 */
export const ocrFileToLines = async (
  file: File,
  password: string | undefined,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string[]> => {
  const lines: string[] = [];

  const worker = await createWorker('por', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text' && onProgress) {
        onProgress({
          page: 0,
          totalPages: 0,
          progress: message.progress ?? 0,
          label: 'Reconhecendo texto',
        });
      }
    },
  });

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    preserve_interword_spaces: '1',
  });

  try {
    if (isPdfFile(file)) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, password }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const canvas = await renderPageToCanvas(page);
        const { data } = await worker.recognize(canvas);
        lines.push(...data.text.split('\n'));
        onProgress?.({
          page: i,
          totalPages: pdf.numPages,
          progress: i / pdf.numPages,
          label: `OCR da página ${i} de ${pdf.numPages}`,
        });
      }
    } else {
      const canvas = await loadImageToCanvas(file);
      const { data } = await worker.recognize(canvas);
      lines.push(...data.text.split('\n'));
      onProgress?.({ page: 1, totalPages: 1, progress: 1, label: 'OCR da imagem' });
    }
  } finally {
    await worker.terminate();
  }

  return lines.filter((line) => line.trim().length > 0);
};

export const isImageFile = (file: File): boolean =>
  file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name);
