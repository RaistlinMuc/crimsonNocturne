const { test, expect } = require('@playwright/test');

async function waitForFrames(page, count = 4) {
  await page.evaluate(async frameCount => {
    for (let i = 0; i < frameCount; i++) {
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
    }
  }, count);
}

async function inspectCanvas(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const effectiveDpr = canvas.width / window.innerWidth;
    const probePoints = {
      topCenter: [window.innerWidth * 0.5, window.innerHeight * 0.12],
      moonZone: [window.innerWidth * 0.82, window.innerHeight * 0.18],
      upperRight: [window.innerWidth * 0.75, window.innerHeight * 0.2],
    };
    const probes = {};
    for (const [name, [x, y]] of Object.entries(probePoints)) {
      const data = ctx.getImageData(Math.floor(x * effectiveDpr), Math.floor(y * effectiveDpr), 1, 1).data;
      probes[name] = data[0] + data[1] + data[2];
    }
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      effectiveDpr,
      probes,
    };
  });
}

function expectFullCoverage(snapshot) {
  expect(snapshot.canvasWidth).toBe(Math.round(snapshot.innerWidth * snapshot.effectiveDpr));
  expect(snapshot.canvasHeight).toBe(Math.round(snapshot.innerHeight * snapshot.effectiveDpr));
  expect(snapshot.probes.topCenter).toBeGreaterThan(5);
  expect(snapshot.probes.moonZone).toBeGreaterThan(5);
  expect(snapshot.probes.upperRight).toBeGreaterThan(5);
}

test('canvas fills the viewport on high-DPR displays and after resize', async ({ page }) => {
  await page.goto('/index.html?autostart=1');
  await waitForFrames(page);

  expectFullCoverage(await inspectCanvas(page));

  await page.setViewportSize({ width: 1280, height: 800 });
  await waitForFrames(page);

  expectFullCoverage(await inspectCanvas(page));
});
