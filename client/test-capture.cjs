const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:5173/');
  
  console.log('Waiting for button to be enabled (isReady)...');
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[aria-label="Describe surroundings"]');
    return btn && !btn.disabled;
  }, { timeout: 10000 });
  
  console.log('Button is ready. Clicking Describe...');
  await page.click('button[aria-label="Describe surroundings"]');
  
  // Wait a second for the log to appear
  await new Promise(r => setTimeout(r, 1000));
  
  await browser.close();
  console.log('Test complete.');
})();
