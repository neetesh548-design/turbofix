import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('http://localhost:4173/turbofix/', { waitUntil: 'networkidle2' });
  
  const content = await page.content();
  console.log('HTML length:', content.length);
  console.log('Root content:', await page.$eval('#root', el => el.innerHTML).catch(() => 'no root'));
  
  await browser.close();
})();
