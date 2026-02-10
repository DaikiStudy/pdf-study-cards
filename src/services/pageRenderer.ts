/** PDF ページを base64 PNG 画像にレンダリングする */

export async function renderPagesToBase64(
  fileData: ArrayBuffer,
  pageNums: number[],
  scale = 1.5
): Promise<Map<number, string>> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: fileData.slice(0) }).promise;
  const result = new Map<number, string>();

  for (const pageNum of pageNums) {
    if (pageNum < 1 || pageNum > pdf.numPages) continue;

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = new OffscreenCanvas(
      Math.floor(viewport.width),
      Math.floor(viewport.height)
    );
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport, canvas } as never).promise;

    const blob = await canvas.convertToBlob({ type: 'image/png', quality: 0.8 });
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    result.set(pageNum, btoa(binary));

    page.cleanup();
  }

  return result;
}
