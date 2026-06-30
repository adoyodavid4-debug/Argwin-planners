const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  await page.screenshot({ path: path.join(__dirname, 'verify-home.png'), fullPage: false });

  // Check favicon link in <head>
  const icons = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[rel*="icon"]'));
    return links.map(l => ({ rel: l.rel, href: l.href, sizes: l.sizes?.value }));
  });
  console.log('Favicon links:', JSON.stringify(icons, null, 2));

  // Check logo img src
  const logoSrc = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.filter(i => i.src.includes('logo')).map(i => ({ src: i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight }));
  });
  console.log('Logo images:', JSON.stringify(logoSrc, null, 2));

  await browser.close();
})();
