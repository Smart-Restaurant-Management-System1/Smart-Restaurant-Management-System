// Dependency-free Chrome DevTools smoke tests. See LANDING_QA.md for setup.
import assert from 'node:assert/strict';

const base = process.env.BISTRO_TEST_URL || 'http://127.0.0.1:4173';
const debuggerUrl = process.env.BISTRO_CDP_URL || 'http://127.0.0.1:9223';
const target = await (await fetch(`${debuggerUrl}/json/new?about:blank`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let nextId = 0;
const requests = new Map();
const runtimeErrors = [];
const apiRequests = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && requests.has(message.id)) {
    const { resolve, reject, timer } = requests.get(message.id);
    clearTimeout(timer);
    requests.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
  if (message.method === 'Network.requestWillBeSent' && /\/(api|reservation-api)\//.test(message.params.request.url)) apiRequests.push(message.params.request.url);
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { requests.delete(id); reject(new Error(`Timed out: ${method}`)); }, 10000);
    requests.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate(expression)) return;
    await pause(100);
  }
  throw new Error(`Page condition not reached: ${expression}`);
}
async function navigate(path, condition) {
  await send('Page.navigate', { url: `${base}${path}` });
  await waitFor(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete'`);
  if (condition) await waitFor(condition);
}
function check(value, description) {
  assert.ok(value, description);
  console.log(`PASS ${description}`);
}

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Network.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate('/', '!!document.querySelector("#hero-title")');
  check(await evaluate('document.querySelectorAll("h1").length === 1 && document.querySelectorAll(".bistro-feature").length === 6 && document.querySelectorAll(".bistro-step-grid li").length === 4'), 'Main heading, six features, and four journey steps render');
  check(await evaluate('Array.from(document.querySelector("main").children).map(el=>el.className).join("|") === "bistro-hero|bistro-values|bistro-section bistro-about|bistro-section bistro-features|bistro-section bistro-steps|bistro-experience|bistro-section bistro-reservations"'), 'Approved section order is preserved');
  check(await evaluate('Array.from(document.querySelectorAll("a")).filter(a=>a.getAttribute("href")?.startsWith("#")).every(a=>document.getElementById(a.getAttribute("href").slice(1)))'), 'Every section link has a target');
  check(await evaluate('Array.from(document.querySelectorAll(".bistro-button-gold")).every(a=>a.getAttribute("href")==="/register")'), 'Guest booking uses the documented account fallback');
  check(apiRequests.length === 0, 'Public homepage makes no protected API requests');
  check(await evaluate('document.title.includes("Cinnamon Bistro") && !!document.querySelector("meta[property=\\"og:title\\"]") && !!document.querySelector("meta[name=\\"twitter:card\\"]")'), 'Brand title and social metadata exist');

  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
    await pause(100);
    check(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `No horizontal overflow at ${width}px`);
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(200);
  await evaluate('document.querySelector(".bistro-menu-toggle").focus()');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitFor('document.querySelector(".bistro-menu-toggle").getAttribute("aria-expanded")==="true"');
  check(true, 'Keyboard opens mobile navigation');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor('document.querySelector(".bistro-menu-toggle").getAttribute("aria-expanded")==="false"');
  check(await evaluate('document.activeElement === document.querySelector(".bistro-menu-toggle")'), 'Escape closes menu and restores toggle focus');
  await evaluate('document.querySelector(".bistro-menu-toggle").click()');
  await evaluate('document.querySelector(".bistro-nav-links a[href=\\"#about\\"]").click()');
  await waitFor('document.activeElement.id === "about"');
  check(await evaluate('location.hash==="#about" && document.querySelector(".bistro-menu-toggle").getAttribute("aria-expanded")==="false"'), 'Section navigation updates hash, focuses section, and closes menu');
  await evaluate('document.querySelector(".bistro-menu-toggle").click(); document.querySelector(".bistro-menu-toggle").focus()');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
  await waitFor('document.querySelector(".bistro-menu-toggle").getAttribute("aria-expanded")==="false"');
  check(true, 'Keyboard focus can leave the menu without being trapped');

  for (const path of ['/login', '/register']) {
    await navigate(path, '!!document.querySelector("form")');
    await send('Page.reload');
    await waitFor('document.readyState === "complete" && !!document.querySelector("form")');
    check(true, `Direct navigation and refresh render ${path}`);
  }
  for (const path of ['/portal', '/profile', '/admin', '/kitchen']) {
    await send('Page.navigate', { url: `${base}${path}` });
    await waitFor('location.pathname === "/login" && !!document.querySelector("form")');
    check(true, `Guest ${path} remains protected`);
  }
  for (const [role, route] of [['Customer', '/portal'], ['Admin', '/admin'], ['KitchenStaff', '/kitchen']]) {
    // UI state fixtures only: no real tokens, logins, or protected API requests.
    await evaluate(`localStorage.setItem('token','landing-ui-test-only');localStorage.setItem('user',JSON.stringify({roles:[${JSON.stringify(role)}]}))`);
    await navigate('/', '!!document.querySelector(".bistro-nav-actions a")');
    check(await evaluate(`Array.from(document.querySelectorAll('.bistro-landing a')).every(a=>!['/login','/register'].includes(a.getAttribute('href'))) && document.querySelector('.bistro-nav-actions a').getAttribute('href')===${JSON.stringify(route)}`), `${role} sees workspace actions without login/register prompts`);
    check(await evaluate(`document.querySelector('.bistro-button-gold').getAttribute('href')===${JSON.stringify(route)}`), `${role} CTA uses the appropriate existing route`);
  }
  await evaluate('localStorage.clear()');
  await navigate('/', '!!document.querySelector("#hero-title")');
  await send('Page.reload');
  await waitFor('!!document.querySelector("#hero-title")');
  await evaluate('window.scrollTo(0,document.body.scrollHeight)');
  await waitFor('Array.from(document.querySelectorAll(".bistro-landing img")).every(img=>img.complete && img.naturalWidth > 0)');
  check(await evaluate('Array.from(document.querySelectorAll(".bistro-landing img")).every(img=>img.currentSrc.endsWith(".webp") && img.hasAttribute("alt") && img.hasAttribute("width") && img.hasAttribute("height"))'), 'Local WebP images load with dimensions and alt attributes');
  check(runtimeErrors.length === 0, 'No JavaScript runtime exceptions');
} finally {
  await send('Page.close').catch(() => {});
  socket.close();
}
