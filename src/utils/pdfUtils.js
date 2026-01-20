/**
 * PDF Processing Utility
 *
 * Converts PDF pages to JPEG images for use with Vision API.
 * Uses pdfjs-dist for client-side PDF rendering.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure worker source (do once at module load)
// Worker must be in public/ with static path because Vite hashes file names
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Process a PDF file into JPEG image files compatible with addImages()
 *
 * @param {File} file - The PDF file from file input
 * @param {number} maxPages - Maximum pages to process (default: 5, aligns with MAX_IMAGES)
 * @param {function} onProgress - Optional progress callback (current, total) => void
 * @returns {Promise<File[]>} - Array of JPEG image files
 *
 * @throws {Error} If PDF is encrypted, corrupted, or has no pages
 *
 * @example
 * const images = await processPdfToImages(pdfFile, 5, (current, total) => {
 *   console.log(`Processing page ${current} of ${total}`);
 * });
 * await addImages(images);
 */
export async function processPdfToImages(file, maxPages = 5, onProgress = null) {
  // Convert File to ArrayBuffer, then to Uint8Array for pdfjs-dist
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  // Load PDF document
  const pdfDoc = await pdfjsLib.getDocument({ data: typedArray }).promise;

  // Calculate pages to render (respect maxPages limit)
  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const images = [];

  // Process each page (PDF.js uses 1-indexed pages)
  for (let i = 1; i <= numPages; i++) {
    // Report progress if callback provided
    if (onProgress) {
      onProgress(i, numPages);
    }

    const page = await pdfDoc.getPage(i);

    // Scale 2.0 provides good text readability without excessive file size
    const viewport = page.getViewport({ scale: 2.0 });

    // Create offscreen canvas for rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert canvas to Blob (more efficient than dataURL for large images)
    // JPEG quality 0.85 balances quality and size
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );

    // Create File object from Blob with descriptive name
    const imageFile = new File(
      [blob],
      `${file.name}-page-${i}.jpg`,
      { type: 'image/jpeg' }
    );

    images.push(imageFile);

    // Clean up page to prevent memory leak
    page.cleanup();
  }

  // Destroy document to free memory
  pdfDoc.destroy();

  return images;
}
