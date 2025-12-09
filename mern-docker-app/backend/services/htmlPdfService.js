const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const { execFile } = require('child_process');
const os = require('os');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// Default PDF output size (pixels)
const PDF_WIDTH_PX = 1120;
const PDF_HEIGHT_PX = 790;

function pxToMm(px) {
  // 1px = 0.2645833333 mm at 96 DPI
  return (px * 0.2645833333).toFixed(3);
}

async function launchPuppeteerWithRetries(retries = 2, opts = {}){
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-software-rasterizer',
    '--disable-dev-profile',
  ];

  const launchOpts = Object.assign({
    args: baseArgs,
    headless: process.env.PUPPETEER_HEADLESS || 'new',
    ignoreHTTPSErrors: true,
    // When PUPPETEER_DUMPIO=1 in env, enable dumpio to stream Chromium stderr/stdout
    dumpio: process.env.PUPPETEER_DUMPIO === '1',
    // slowMo: 0,
  }, opts || {});

  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++){
    try {
      // allow providing executablePath via env if needed
      if (process.env.PUPPETEER_EXECUTABLE_PATH) launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      const browser = await puppeteer.launch(launchOpts);
      return browser;
    } catch (err) {
      lastErr = err;
      console.warn(`puppeteer launch attempt ${attempt} failed:`, err && err.message ? err.message : err);
      // small delay before retry
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr || new Error('Failed to launch puppeteer');
}

// Return path to wkhtmltopdf binary if available, or null
async function findWkhtmltopdfBin() {
  const candidates = [
    '/usr/local/bin/wkhtmltopdf',
    '/opt/homebrew/bin/wkhtmltopdf',
    '/usr/bin/wkhtmltopdf',
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (e) {}
  }
  try {
    const { stdout } = await execFileAsync('which', ['wkhtmltopdf']);
    const pathFound = (stdout || '').trim();
    if (pathFound) return pathFound;
  } catch (e) {
    // ignore
  }
  return null;
}

function fileToDataUrl(filePath) {
  try {
    const bytes = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
    return `data:${mime};base64,${bytes.toString('base64')}`;
  } catch (e) {
    return null;
  }
}

async function renderTemplateToPdfBuffer(templatePath, data) {
  const tplSrc = fs.readFileSync(templatePath, 'utf8');
  const compile = Handlebars.compile(tplSrc);
  const html = compile(data);
  try {
    // If user explicitly forces wkhtmltopdf, or on macOS prefer wkhtmltopdf when available
    const forceWk = process.env.FORCE_WKHTMLTOPDF === '1';
    if (forceWk || (process.platform === 'darwin' && await findWkhtmltopdfBin())) {
      const pdfBuffer = await tryWkhtmltopdfFallback(html);
      return { pdfBuffer };
    }

    const browser = await launchPuppeteerWithRetries(2);
    try {
      const page = await browser.newPage();
      try {
        // set an initial viewport large enough for typical templates
        await page.setViewport({ width: Math.max(1200, PDF_WIDTH_PX), height: Math.max(900, PDF_HEIGHT_PX) });
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

        // Attempt to read the rendered .canvas size from the page. If a background image
        // probe was included, the canvas will have been resized to the background's intrinsic
        // pixel dimensions. Otherwise fall back to default constants.
        const dims = await page.evaluate(() => {
          try {
            const c = document.querySelector('.canvas');
            if (!c) return null;
            const r = c.getBoundingClientRect();
            return { w: Math.round(r.width), h: Math.round(r.height) };
          } catch (e) { return null; }
        });

        let pdfWidth = PDF_WIDTH_PX;
        let pdfHeight = PDF_HEIGHT_PX;
        if (dims && dims.w > 0 && dims.h > 0) {
          // If the template canvas is larger than our target PDF size, compute a uniform scale
          // so the content fits within one page (preserve aspect ratio). Otherwise keep intrinsic size.
          const maxW = PDF_WIDTH_PX;
          const maxH = PDF_HEIGHT_PX;
          const scale = Math.min(1, maxW / dims.w, maxH / dims.h);

          // If scaling is needed, inject a runtime style to scale the .canvas element
          if (scale < 1) {
            const scaleCss = `.canvas{transform-origin:0 0; transform: scale(${scale});}`;
            try {
              await page.addStyleTag({ content: scaleCss });
            } catch (e) {
              // ignore if style injection fails
            }
          }

          // PDF dimensions are the scaled canvas pixel size (or intrinsic if scale===1)
          pdfWidth = Math.min(Math.max(200, Math.round(dims.w * scale)), 10000);
          pdfHeight = Math.min(Math.max(200, Math.round(dims.h * scale)), 10000);
        }

        const pdfBuffer = await page.pdf({ 
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });
        await page.close();
        return { pdfBuffer, renderer: 'puppeteer', pdfWidth, pdfHeight };
      } catch (pageErr) {
        try { await page.close(); } catch(_){ }
        pageErr.__source = pageErr.__source || 'puppeteer';
        throw pageErr;
      }
    } finally {
      try { await browser.close(); } catch(_){ }
    }
  } catch (puppErr) {
    console.warn('puppeteer render failed, attempting wkhtmltopdf fallback:', puppErr && puppErr.message ? puppErr.message : puppErr);
    try {
      const pdfBuffer = await tryWkhtmltopdfFallback(html);
      return { pdfBuffer, renderer: 'wkhtmltopdf' };
    } catch (wkErr) {
      const combined = new Error('Both Puppeteer and wkhtmltopdf failed to render the template.');
      combined.puppeteer = puppErr;
      combined.wkhtmltopdf = wkErr;
      throw combined;
    }
  }
}

async function tryWkhtmltopdfFallback(html) {
  // Check for wkhtmltopdf availability
  const candidates = [
    '/usr/local/bin/wkhtmltopdf',
    '/opt/homebrew/bin/wkhtmltopdf',
    '/usr/bin/wkhtmltopdf',
  ];
  let bin = null;
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) { bin = c; break; }
    } catch (e) {}
  }
  // try `which wkhtmltopdf` as fallback
  if (!bin) {
    try {
      const { stdout } = await execFileAsync('which', ['wkhtmltopdf']);
      const pathFound = (stdout || '').trim();
      if (pathFound) bin = pathFound;
    } catch (e) {
      // ignore
    }
  }

  if (!bin) {
    const err = new Error('Puppeteer failed and wkhtmltopdf fallback is not available on this system. Install wkhtmltopdf (brew install wkhtmltopdf) or configure Puppeteer to use a compatible Chrome/Chromium binary via PUPPETEER_EXECUTABLE_PATH.');
    err.code = 'NO_FALLBACK_RENDERER';
    throw err;
  }

  // write temp files
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-html-'));
  const htmlPath = path.join(tmpDir, 'input.html');
  const outPath = path.join(tmpDir, 'out.pdf');
  fs.writeFileSync(htmlPath, html, 'utf8');

  // wkhtmltopdf options: set page size (convert px->mm) and enable-local-file-access
  const widthMm = pxToMm(PDF_WIDTH_PX);
  const heightMm = pxToMm(PDF_HEIGHT_PX);
  const args = ['--enable-local-file-access', '--page-width', `${widthMm}mm`, '--page-height', `${heightMm}mm`, htmlPath, outPath];
  try {
    await execFileAsync(bin, args, { timeout: 60000 });
    const pdfBuffer = fs.readFileSync(outPath);
    // cleanup
    try { fs.unlinkSync(htmlPath); } catch(_){}
    try { fs.unlinkSync(outPath); } catch(_){}
    try { fs.rmdirSync(tmpDir); } catch(_){}
    return pdfBuffer;
  } catch (e) {
    // Provide helpful guidance
    const ex = new Error(`wkhtmltopdf failed to render PDF (binary: ${bin}). Error: ${e.message}`);
    ex.original = e;
    throw ex;
  }
}

async function generateCertificatePdfFromHtml(certificateData) {
  // Map certificateData to template variables
  const tplPath = path.join(__dirname, '..', 'templates', 'certificate.html');
  if (!fs.existsSync(tplPath)) {
    throw new Error('HTML certificate template not found at ' + tplPath);
  }

  // Inline images if present in templates folder
  const templatesDir = path.join(__dirname, '..', 'templates');
  const logoPng = path.join(templatesDir, 'logo.png');
  const logoJpg = path.join(templatesDir, 'logo.jpg');
  const sigLeftPng = path.join(templatesDir, 'signature_left.png');
  const sigLeftJpg = path.join(templatesDir, 'signature_left.jpg');
  const sigRightPng = path.join(templatesDir, 'signature_right.png');
  const sigRightJpg = path.join(templatesDir, 'signature_right.jpg');

  const logoData = fileToDataUrl(fs.existsSync(logoPng) ? logoPng : (fs.existsSync(logoJpg) ? logoJpg : '')) || null;
  const sigLeftData = fileToDataUrl(fs.existsSync(sigLeftPng) ? sigLeftPng : (fs.existsSync(sigLeftJpg) ? sigLeftJpg : '')) || null;
  const sigRightData = fileToDataUrl(fs.existsSync(sigRightPng) ? sigRightPng : (fs.existsSync(sigRightJpg) ? sigRightJpg : '')) || null;

  const templateData = {
    student_name: certificateData.learnerName || certificateData.student_name || certificateData.learner?.name || 'Learner',
    course_name: certificateData.courseName || certificateData.course?.title || certificateData.course_name || 'Course',
    institute_name: certificateData.instituteName || certificateData.institute?.name || certificateData.institute_name || 'Issuing Institution',
    issue_date: certificateData.issueDate || certificateData.issue_date || new Date().toLocaleDateString(),
    duration: certificateData.duration || '',
    nsqf_level: certificateData.nsqfLevel || certificateData.ncvqLevel || '',
    certificate_id: certificateData.certificateId || certificateData.certificate_id || 'CERT-UNKNOWN',
    verification_url: process.env.FRONTEND_URL || process.env.VERIFICATION_BASE_URL || (process.env.API_URL || 'http://localhost:8080'),
    logo_src: logoData || certificateData.logo_src || '',
    signature_left_src: sigLeftData || certificateData.signature_left_src || '',
    signature_right_src: sigRightData || certificateData.signature_right_src || '',
    signatory_left_name: certificateData.signatory_left_name || certificateData.signatory_left || '',
    signatory_left_role: certificateData.signatory_left_role || '',
    signatory_right_name: certificateData.signatory_right_name || certificateData.signatory_right || '',
    signatory_right_role: certificateData.signatory_right_role || '',
  };

  const pdfBuffer = await renderTemplateToPdfBuffer(tplPath, templateData);
  return { pdfBuffer };
}

async function generatePdfFromTemplate(templateDoc = {}, certificateData = {}, options = {}) {
  // Build an absolute-page HTML with absolute-positioned fields based on templateDoc
  const tplDir = path.join(__dirname, '..');

  let backgroundDataUrl = null;
  if (templateDoc.backgroundPath) {
    try {
      // backgroundPath stored like '/uploads/templates/<instId>/<file>'
      const rel = templateDoc.backgroundPath.replace(/^\//, '');
      const filePath = path.join(tplDir, rel);
      backgroundDataUrl = fileToDataUrl(filePath);
    } catch (e) {
      backgroundDataUrl = null;
    }
  }

  const fields = (templateDoc.fields || []).map((f) => {
    // Get value from certificateData - ignore f.text as it's just a placeholder
    let textValue = '';
    let matchSource = 'none';
    
    if (f.key) {
      // 1. Try exact key match first
      if (certificateData.hasOwnProperty(f.key)) {
        textValue = certificateData[f.key];
        matchSource = 'exact';
      }
      
      // 2. If not found, try case-insensitive match (PRIORITY)
      if ((!textValue && textValue !== 0) || !certificateData.hasOwnProperty(f.key)) {
        const keyLower = f.key.toLowerCase();
        const matchedKey = Object.keys(certificateData).find(
          k => k.toLowerCase() === keyLower
        );
        if (matchedKey && certificateData[matchedKey]) {
          textValue = certificateData[matchedKey];
          matchSource = 'case-insensitive';
        }
      }
      
      // 3. If still not found, try common field mappings
      if (!textValue && textValue !== 0) {
        const keyLower = f.key.toLowerCase();
        
        // Map common field names
        if (keyLower.includes('name') && !keyLower.includes('course')) {
          textValue = certificateData.name || certificateData.learnerName || certificateData.student_name || '';
          matchSource = 'name-mapping';
        } else if (keyLower.includes('email')) {
          textValue = certificateData.email || '';
          matchSource = 'email-mapping';
        } else if (keyLower.includes('course')) {
          textValue = certificateData.course || certificateData.courseName || '';
          matchSource = 'course-mapping';
        } else if (keyLower.includes('certificate') && keyLower.includes('id')) {
          textValue = certificateData.certificateId || '';
          matchSource = 'certid-mapping';
        }
      }
    }
    
    // If still no value, use f.text as fallback (for static fields)
    if (!textValue && textValue !== 0) {
      textValue = f.text || '';
      matchSource = 'fallback-text';
    }
    
    // Debug log for each field
    console.log(`🔍 Field mapping: key="${f.key}" → value="${textValue}" source=${matchSource}`);
    
    return {
      key: f.key,
      type: f.type || 'text',
      text: String(textValue || ''),
      fontFamily: f.fontFamily || templateDoc.defaultFont || 'Roboto',
      fontSize: f.fontSize || templateDoc.defaultFontSize || 14,
      color: f.color || '#000',
      xPct: f.xPct || 50,
      yPct: f.yPct || 50,
      zIndex: f.zIndex || 1,
    };
  });

  const watermark = templateDoc.watermark || { invisible: true };

  // Build HTML
  const htmlParts = [];
  htmlParts.push('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
  // Build @font-face rules for any fonts uploaded with the template (templateDoc.fonts)
  let fontsCss = '';
  try {
    const fontsList = Array.isArray(templateDoc.fonts) ? templateDoc.fonts : [];
    // Collect families used by fields
    const usedFamilies = Array.from(new Set(fields.map((f) => f.fontFamily))).filter(Boolean);
    usedFamilies.forEach((family) => {
      // Find a matching font entry by family name (case-insensitive)
      const entry = fontsList.find((ff) => ff && ff.family && ff.family.toLowerCase() === family.toLowerCase());
      if (entry && entry.path) {
        try {
          const rel = entry.path.replace(/^\//, '');
          const filePath = path.join(__dirname, '..', rel);
          const dataUrl = fileToDataUrl(filePath);
          if (dataUrl) {
            const ext = (path.extname(filePath) || '').toLowerCase().replace('.', '');
            let fmt = 'truetype';
            if (ext === 'woff') fmt = 'woff';
            else if (ext === 'woff2') fmt = 'woff2';
            else if (ext === 'otf') fmt = 'opentype';
            else if (ext === 'ttf') fmt = 'truetype';
            // Sanitize font-family for CSS (keep original family name)
            const safeFamily = family.replace(/"/g, '\\"');
            fontsCss += `@font-face { font-family: "${safeFamily}"; src: url(${dataUrl}) format('${fmt}'); font-weight: normal; font-style: normal; }\n`;
          }
        } catch (e) {
          // ignore font embedding failure for this font
        }
      }
    });
  } catch (e) {
    fontsCss = '';
  }

  htmlParts.push(`
    <style>
      ${fontsCss}
      @page{margin:0;size:A4 landscape;}
      html,body{margin:0;padding:0;width:297mm;height:210mm;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      *,*::before,*::after{box-sizing:border-box}
      .canvas{position:relative;width:100%;height:100%;page-break-before:avoid;page-break-after:avoid;page-break-inside:avoid;break-before:avoid;break-after:avoid;break-inside:avoid;}
      .field{position:absolute;transform:translate(-50%,-50%);white-space:pre-wrap;}
      .watermark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;}
      /* aggressive single-page enforcement */
      .canvas, .canvas * { page-break-inside: avoid !important; break-inside: avoid !important; -webkit-column-break-inside: avoid !important; }
      @media print {
        html,body{width:297mm!important;height:210mm!important;overflow:hidden!important;}
        .canvas{page-break-after:avoid!important;page-break-before:avoid!important;width:100%!important;height:100%!important;}
      }
    </style>
  `);
  htmlParts.push('</head><body>');

  // If we have a background image, include it as both a CSS background and a hidden probe image
  // so Puppeteer can detect the background's intrinsic pixel dimensions and we can size the PDF accordingly.
  const bgStyle = backgroundDataUrl ? `background-image:url(${backgroundDataUrl});background-size:cover;background-position:center;` : 'background:#fff;';
  // Use full page - no fixed pixel dimensions
  htmlParts.push(`<div class="canvas" style="${bgStyle}">`);

  if (backgroundDataUrl) {
    // hidden image used to probe naturalWidth/naturalHeight - NOT NEEDED anymore for full page
    // Background will stretch to fill entire page automatically
  }

  // Fields
  fields.forEach((f) => {
    const style = `left:${f.xPct}%;top:${f.yPct}%;font-family:${f.fontFamily};font-size:${f.fontSize}px;color:${f.color};z-index:${f.zIndex};`;
    htmlParts.push(`<div class="field" style="${style}">${Handlebars.escapeExpression(f.text)}</div>`);
  });

  // Invisible watermark: low-opacity text
  if (watermark && watermark.invisible) {
    const wmText = watermark.text || certificateData.certificateId || '';
    const opacity = typeof watermark.opacity === 'number' ? watermark.opacity : 0.02;
    const wmStyle = `font-size:28px;color:#000;opacity:${opacity};z-index:0;`;
    htmlParts.push(`<div class="watermark" style="${wmStyle}">${Handlebars.escapeExpression(wmText)}</div>`);
  }

  htmlParts.push('</div>');
  htmlParts.push('</body></html>');

  const html = htmlParts.join('\n');

  try {
    // Prefer wkhtmltopdf on macOS when available or if forced by env
    const forceWk = process.env.FORCE_WKHTMLTOPDF === '1';
    if (forceWk || (process.platform === 'darwin' && await findWkhtmltopdfBin())) {
      const pdfBuffer = await tryWkhtmltopdfFallback(html);
      return { pdfBuffer };
    }

    const browser = await launchPuppeteerWithRetries(2);
    try {
      const page = await browser.newPage();
      try {
        // render the HTML
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        // prefer screen media to avoid print-specific pagination rules
        try { await page.emulateMediaType('screen'); } catch (e) {}

        // Use full A4 page - no scaling, no dynamic sizing
        // Canvas already sized to 297mm x 210mm in HTML/CSS
        
        const pdfBuffer = await page.pdf({ 
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          preferCSSPageSize: false,
          pageRanges: '1'
        });
        await page.close();
        return { pdfBuffer, renderer: 'puppeteer' };
      } catch (pageErr) {
        try { await page.close(); } catch(_){ }
        pageErr.__source = pageErr.__source || 'puppeteer';
        throw pageErr;
      }
    } finally {
      try { await browser.close(); } catch(_){ }
    }
  } catch (puppErr) {
    console.warn('puppeteer render failed (generatePdfFromTemplate), attempting wkhtmltopdf fallback:', puppErr && puppErr.message ? puppErr.message : puppErr);
    try {
      const pdfBuffer = await tryWkhtmltopdfFallback(html);
      return { pdfBuffer, renderer: 'wkhtmltopdf' };
    } catch (wkErr) {
      const combined = new Error('Both Puppeteer and wkhtmltopdf failed to render the template.');
      combined.puppeteer = puppErr;
      combined.wkhtmltopdf = wkErr;
      throw combined;
    }
  }
}

module.exports = {
  generateCertificatePdfFromHtml,
  generatePdfFromTemplate,
  tryWkhtmltopdfFallback,
  findWkhtmltopdfBin,
};

