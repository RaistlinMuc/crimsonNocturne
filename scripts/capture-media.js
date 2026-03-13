const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname ? path.resolve(__dirname, '..') : process.cwd();
const baseUrl = process.env.CRIMSON_BASE_URL || 'http://127.0.0.1:4173';
const screenshotDir = path.join(ROOT, 'media', 'screenshots');
const videoDir = path.join(ROOT, 'media', 'video');
const tempVideoDir = path.join(videoDir, 'tmp');
const frameDir = path.join(tempVideoDir, 'gif-frames');

for (const dir of [screenshotDir, videoDir, tempVideoDir, frameDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

async function waitFrames(page, count = 6) {
  await page.evaluate(async frameCount => {
    for (let i = 0; i < frameCount; i++) {
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
    }
  }, count);
}

async function driveDemo(page, durationMs = 18000) {
  const segments = [
    { keys: ['KeyD'], duration: 1600 },
    { keys: ['KeyD', 'KeyS'], duration: 1500, dash: true },
    { keys: ['KeyS'], duration: 1600 },
    { keys: ['KeyA', 'KeyS'], duration: 1500 },
    { keys: ['KeyA'], duration: 1600, dash: true },
    { keys: ['KeyA', 'KeyW'], duration: 1500 },
    { keys: ['KeyW'], duration: 1600 },
    { keys: ['KeyD', 'KeyW'], duration: 1500 },
  ];

  const start = Date.now();
  let index = 0;
  while (Date.now() - start < durationMs) {
    const segment = segments[index % segments.length];
    for (const key of segment.keys) await page.keyboard.down(key);
    if (segment.dash) await page.keyboard.press('Space');
    await page.waitForTimeout(segment.duration);
    for (const key of segment.keys.slice().reverse()) await page.keyboard.up(key);
    index += 1;
  }
}

async function captureTitle(browser) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html`);
  await waitFrames(page);
  await page.screenshot({
    path: path.join(screenshotDir, 'title-screen.png'),
    fullPage: true,
  });
  await context.close();
}

async function captureGameplay(browser) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html?autostart=1`);
  await waitFrames(page);
  await driveDemo(page, 12000);
  await page.screenshot({
    path: path.join(screenshotDir, 'live-run.png'),
  });
  await driveDemo(page, 10000);
  await page.screenshot({
    path: path.join(screenshotDir, 'swarm-combat.png'),
  });
  await context.close();
}

async function captureVideo(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html?autostart=1`);
  await waitFrames(page);
  for (const entry of fs.readdirSync(frameDir)) {
    fs.unlinkSync(path.join(frameDir, entry));
  }
  for (let i = 0; i < 28; i++) {
    await driveDemo(page, 220);
    await page.screenshot({
      path: path.join(frameDir, `frame-${String(i).padStart(3, '0')}.png`),
    });
  }
  await page.waitForTimeout(300);
  await driveDemo(page, 18000);
  const video = page.video();
  await context.close();
  const sourcePath = await video.path();
  const targetPath = path.join(videoDir, 'crimson-nocturne-demo.webm');
  if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  fs.renameSync(sourcePath, targetPath);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await captureTitle(browser);
    await captureGameplay(browser);
    await captureVideo(browser);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
