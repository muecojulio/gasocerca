// Optional browser regressions. No application/test dependencies are added to package.json.
// See docs/interacciones.md for isolated QA tools, browser installation and invocation.
// Product APIs are mocked; the map runs the actual Leaflet 1.9.4 code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const { expect: baseExpect } = require('playwright/test');
const expect = baseExpect.configure({timeout:6000});
const AxeBuilder = require('@axe-core/playwright').default;
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUTPUT = process.env.QA_OUTPUT_DIR || path.join(os.tmpdir(), 'gasocerca-qa');
fs.mkdirSync(OUTPUT, {recursive:true});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const merida = [
  {label:'Mérida, Yucatán, México',lat:20.967,lng:-89.624},
  {label:'Mérida Centro, Yucatán, México',lat:20.97,lng:-89.62},
  {label:'Mérida Sur, Yucatán, México',lat:20.96,lng:-89.61},
  {label:'Mérida Norte, Yucatán, México',lat:20.99,lng:-89.63},
];
const destinations = [{label:'Acapulco, Guerrero, México',lat:16.85,lng:-99.9},{label:'Acapulco Centro, Guerrero, México',lat:16.86,lng:-99.89}];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
let checks = 0;
const errors = [];

async function fixturePage(browser, settings={}) {
  const context = await browser.newContext({viewport:{width:1280,height:900}, ...settings, serviceWorkers:'block'});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const calls = [];
  const mode = {stationsError:false, slowPremium:false, searchErrorCount:0, routeError:false};
  await page.route('https://*.tile.openstreetmap.org/**', route=>route.fulfill({contentType:'image/png',body:png}));
  function stationsFor(lat,lng,tipo='regular') {
    const stations = [
      {id:'a', name:'Servicio Centro',cre:'PL/001',lat:lat+.001,lng:lng+.001,regular:25.1,premium:27.2,distance:1.2,desvioKm:.8},
      {id:'b', name:'Estación Ahorro',cre:'PL/002',lat:lat+.005,lng:lng+.002,regular:23.45,premium:26.2,distance:3.1,desvioKm:.5},
      {id:'c', name:'Gasolinera Ruta',cre:'PL/003',lat:lat+.008,lng:lng+.004,regular:24.3,premium:25.3,distance:4.6,desvioKm:1.1},
    ];
    const mejor = [...stations].sort((a,b)=>a[tipo]-b[tipo])[0];
    return {stations,mejor};
  }
  await page.route('**/api/**', async route=>{
    const url = new URL(route.request().url());
    calls.push(url.pathname+url.search);
    const q = url.searchParams.get('q') || '';
    const tipo = url.searchParams.get('tipo') || 'regular';
    if (url.pathname === '/api/buscar') {
      if (q==='lento') await sleep(900); else await sleep(50);
      if (q==='error' && mode.searchErrorCount++===0) return route.fulfill({status:502,json:{error:'No se pudo buscar esa ciudad ahora.'}});
      const results = q==='zzz' ? [] : q.startsWith('acapulco') ? destinations : merida;
      return route.fulfill({json:{results}});
    }
    if (url.pathname==='/api/estaciones') {
      const lat=Number(url.searchParams.get('lat')),lng=Number(url.searchParams.get('lng'));
      const {stations,mejor} = stationsFor(lat,lng,tipo);
      await sleep(mode.slowPremium&&tipo==='premium'?900:250);
      if (mode.stationsError) return route.fulfill({status:502,json:{error:'No se pudieron leer los datos oficiales de la CNE.'}});
      return route.fulfill({json:{updatedAt:'2026-10-09T12:00:00.000Z',tipo,radioKm:Number(url.searchParams.get('radio')),totalZona:3,promedioZona:25.7,cercanas:stations,baratas:stations,mejor,masCercana:stations[0]}});
    }
    if (url.pathname==='/api/ruta') {
      await sleep(350);
      if (mode.routeError) return route.fulfill({status:502,json:{error:'No se pudo calcular la ruta ahora.'}});
      const lat=Number(url.searchParams.get('fromLat')),lng=Number(url.searchParams.get('fromLng'));
      const {stations,mejor}=stationsFor(lat,lng,tipo);
      return route.fulfill({json:{distanciaKm:60,duracionMin:75,geometry:[[lng,lat],[Number(url.searchParams.get('toLng')),Number(url.searchParams.get('toLat'))]],estaciones:stations,mejor}});
    }
    return route.continue();
  });
  await page.goto(BASE);
  await page.getByRole('tab',{name:'Más cercanas',exact:true}).waitFor();
  return {context,page,calls,mode};
}
async function noOverflow(page) {
  const size = await page.evaluate(()=>({doc:document.documentElement.scrollWidth,width:innerWidth}));
  assert.ok(size.doc<=size.width, JSON.stringify(size));
}
async function axe(page, name) {
  const report = await new AxeBuilder({page}).include('.app-shell').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  if(report.violations.length) console.log('AXE '+name,JSON.stringify(report.violations.map(v=>({id:v.id,description:v.description,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})),null,2));
  assert.equal(report.violations.length,0,'Axe '+name);
}
async function check(name, fn) { await fn(); checks++; console.log('✓ '+name); }
async function selectOrigin(page, touch=false) {
  const input = page.getByRole('combobox',{name:'Origen',exact:true});
  await input.fill('MÉRIDA');
  const option=page.getByRole('option',{name:merida[0].label,exact:true});
  await option.waitFor();
  if(touch) await option.tap(); else await input.press('Enter');
  await expect(page.locator('#section-panel-cercanas .swipe-card')).toHaveCount(3);
  await expect(input).toHaveAttribute('aria-expanded','false');
}
async function swipe(page, locator, dx, dy=0) {
  await locator.scrollIntoViewIfNeeded();
  const rect=await locator.boundingBox();
  assert.ok(rect,'touch target visible');
  const vw=await page.evaluate(()=>innerWidth), vh=await page.evaluate(()=>innerHeight);
  const x=Math.min(vw-30,Math.max(30,rect.x+rect.width*.65));
  const y=Math.min(vh-110,Math.max(40,rect.y+Math.min(rect.height/2,70)));
  const endX=Math.min(vw-22,Math.max(22,x+dx));
  const endY=Math.min(vh-100,Math.max(25,y+dy));
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  for(let i=1;i<=8;i++) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(endX-x)*i/8,y:y+(endY-y)*i/8,id:1}]});
    await sleep(20);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
}

(async()=>{
  const browser=await chromium.launch({headless:true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {}), args:['--no-sandbox','--disable-dev-shm-usage']});
  let currentPage;
  try {
    const desktop=await fixturePage(browser);
    const {page,calls,mode}=desktop;
    currentPage=page;
    await check('Combustible: solo gasolina Magna y Premium',async()=>{
      const fuels=page.getByRole('group',{name:'Combustible',exact:true});
      await expect(fuels.getByRole('button')).toHaveCount(2);
      await expect(fuels.getByRole('button',{name:'Magna',exact:true})).toHaveAttribute('aria-pressed','true');
      await expect(fuels.getByRole('button',{name:'Premium',exact:true})).toHaveAttribute('aria-pressed','false');
      await expect(fuels.getByText('Diésel',{exact:true})).toHaveCount(0);
    });
    await check('Pestañas: semántica, flechas, Inicio/Fin y foco itinerante',async()=>{
      await expect(page.getByRole('tab')).toHaveCount(5);
      await expect(page.getByRole('tablist')).toHaveCount(1);
      await expect(page.getByRole('tabpanel')).toHaveCount(1);
      const first=page.getByRole('tab',{name:'Más cercanas',exact:true});
      await first.focus();
      await first.press('ArrowRight');
      await expect(page.getByRole('tab',{name:'Más baratas',exact:true})).toHaveAttribute('aria-selected','true');
      await expect(page.getByRole('tab',{name:'Más baratas',exact:true})).toBeFocused();
      await page.keyboard.press('End');
      await expect(page.getByRole('tabpanel',{name:'Comparar',exact:true})).toBeVisible();
      await page.keyboard.press('Home');
      await expect(first).toHaveAttribute('tabindex','0');
      assert.equal(await page.locator('[role=tab][tabindex="0"]').count(),1);
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByRole('tab',{name:'Comparar',exact:true})).toBeFocused();
      await page.keyboard.press('Home');
    });
    await check('Combobox: acentos, carga, navegación completa y selección',async()=>{
      const input=page.getByRole('combobox',{name:'Origen',exact:true});
      await input.fill('MÉRIDA');
      await expect(input).toHaveAttribute('aria-busy','true');
      await expect(page.getByRole('option')).toHaveCount(4);
      assert.ok(calls.some(url=>url.includes('q=merida')));
      await input.press('End');
      await expect(input).toHaveAttribute('aria-activedescendant','origen-option-3');
      await input.press('Home');
      await input.press('ArrowDown');
      await expect(input).toHaveAttribute('aria-activedescendant','origen-option-1');
      await input.press('Enter');
      await expect(input).toHaveValue('Mérida Centro');
      await expect(input).toBeFocused();
      await expect(input).toHaveAttribute('aria-expanded','false');
      await expect(page.locator('.hero .actions button').nth(1)).toBeDisabled();
      await expect(page.locator('#section-panel-cercanas .swipe-card')).toHaveCount(3);
      await expect(page.locator('#section-panel-cercanas .price-pill')).toHaveCount(6);
      await expect(page.locator('.hero .actions button').nth(1)).toHaveAttribute('data-state','success');
    });
    await check('Combobox: caché normalizada, Escape, clic fuera, sin resultados y reintento',async()=>{
      const input=page.getByRole('combobox',{name:'Origen',exact:true});
      const count=calls.filter(url=>url==='/api/buscar?q=merida').length;
      await input.fill('merida');
      await expect(page.getByRole('option')).toHaveCount(4);
      assert.equal(calls.filter(url=>url==='/api/buscar?q=merida').length,count);
      await input.press('Escape');
      await expect(input).toHaveAttribute('aria-expanded','false');
      await expect(input).toBeFocused();
      await input.press('ArrowDown');
      await page.getByRole('heading',{name:'GasoCerca',exact:true}).click();
      await expect(input).toHaveAttribute('aria-expanded','false');
      await input.fill('zzz');
      await expect(page.locator('.combobox-message').filter({hasText:'Sin coincidencias'})).toBeVisible();
      await input.fill('error');
      await expect(input).toHaveAttribute('aria-invalid','true');
      await page.getByRole('button',{name:'Reintentar búsqueda',exact:true}).click();
      await expect(input).toBeFocused();
      await expect(page.getByRole('option')).toHaveCount(4);
      await input.press('Escape');
    });
    await check('Combobox: las respuestas antiguas no reemplazan una búsqueda nueva',async()=>{
      const input=page.getByRole('combobox',{name:'Origen',exact:true});
      await input.fill('lento');
      await expect.poll(()=>calls.includes('/api/buscar?q=lento')).toBe(true);
      await input.fill('acapulco');
      await expect(page.getByRole('option')).toHaveCount(2);
      await sleep(700);
      await expect(page.getByRole('option')).toHaveCount(2);
      await expect(page.getByRole('option').first()).toHaveText(destinations[0].label);
      await input.press('Escape');
    });
    await check('Precios: error, reintento y protección ante respuestas antiguas' ,async()=>{
      const refresh=page.locator('.hero .actions button').nth(1);
      mode.stationsError=true;
      await refresh.click();
      await expect(refresh).toHaveAttribute('aria-busy','true');
      await expect(refresh).toBeDisabled();
      await expect(page.locator('.app-shell').getByRole('alert')).toContainText('CNE');
      await expect(refresh).toHaveAttribute('data-state','error');
      mode.stationsError=false;
      await refresh.click();
      await expect(refresh).toHaveAttribute('data-state','success');
      await expect(page.locator('.data-stamp')).toContainText('Consulta del catálogo CNE');
      mode.slowPremium=true;
      await page.getByRole('button',{name:'Premium',exact:true}).click();
      await page.getByRole('button',{name:'Magna',exact:true}).click();
      await expect(refresh).toHaveAttribute('data-state','success');
      await sleep(1000);
      await expect(page.locator('#section-panel-cercanas .price-pill.selected').first()).toContainText('$25.10');
      await expect(page.getByRole('button',{name:'Magna',exact:true})).toHaveAttribute('aria-pressed','true');
    });
    await check('Orden de baratas y acciones de escritorio siempre disponibles',async()=>{
      await page.getByRole('tab',{name:'Más baratas',exact:true}).click();
      await expect(page.locator('#section-panel-baratas .swipe-card h3').first()).toHaveText('Estación Ahorro');
      await expect(page.getByRole('link',{name:/Cómo llegar a Estación Ahorro/})).toBeVisible();
      await expect(page.locator('#section-panel-baratas .swipe-actions').first()).toHaveAttribute('aria-hidden','false');
      await axe(page,'lista de estaciones escritorio');
      await page.screenshot({path:path.join(OUTPUT, 'desktop-loaded.png'),fullPage:true});
    });
    await check('Destino conservado, ruta sin duplicados y disclosure accesible',async()=>{
      const input=page.getByRole('combobox',{name:'Destino',exact:true});
      await input.fill('Acapulco');
      await expect(page.getByRole('option')).toHaveCount(2);
      await input.press('End');
      await input.press('Enter');
      const routeButton=page.locator('.route-button');
      await expect(routeButton).toHaveAttribute('aria-busy','true');
      await expect(routeButton).toBeDisabled();
      await expect(page.getByRole('tab',{name:'En ruta',exact:true})).toHaveAttribute('aria-selected','true');
      assert.equal(calls.filter(url=>url.startsWith('/api/ruta')).length,1);
      const url=new URL(await page.getByRole('link',{name:'Ruta con parada barata en Google Maps (abre en otra pestaña)'}).getAttribute('href'));
      assert.equal(url.searchParams.get('destination'),'16.86,-99.89');
      assert.ok(url.searchParams.get('waypoints'));
      const accordion=page.getByRole('button',{name:'Destino y ruta',exact:true});
      await accordion.click();
      await expect(accordion).toHaveAttribute('aria-expanded','false');
      await expect(input).toBeHidden();
      assert.equal(await page.getByRole('combobox').count(),1);
      await accordion.click();
      await expect(input).toBeVisible();
      await axe(page,'ruta escritorio');
    });
    await check('Mapa real: carga única, controles de 44px y alternativa en listas',async()=>{
      await page.getByRole('tab',{name:'Mapa',exact:true}).click();
      await page.locator('#map.leaflet-container').waitFor();
      const zoom=page.getByRole('button',{name:'Acercar mapa',exact:true});
      await zoom.waitFor();
      const box=await zoom.boundingBox();
      assert.ok(box.width>=44&&box.height>=44,JSON.stringify(box));
      await zoom.click();
      await expect(page.getByRole('tab',{name:'Mapa',exact:true})).toHaveAttribute('aria-selected','true');
      await axe(page,'mapa');
      await page.getByRole('tab',{name:'Comparar',exact:true}).click();
      await page.getByRole('tab',{name:'Mapa',exact:true}).click();
      await zoom.waitFor();
      assert.equal(await page.evaluate(()=>window.L?.version),'1.9.4');
    });
    await check('GPS: estados, error, reintento y ciudad elegida durante una lectura',async()=>{
      await page.evaluate(()=>{
        window.__gpsMode='success';
        window.__gpsCalls=0;
        navigator.geolocation.getCurrentPosition=(success,error)=>{
          window.__gpsCalls++;
          const mode=window.__gpsMode;
          setTimeout(()=>mode==='error' ? error({code:1}) : success({coords:{latitude:19.4326,longitude:-99.1332}}),500);
        };
      });
      const gps=page.locator('.hero .actions button').first();
      await gps.click();
      await expect(gps).toHaveAttribute('aria-busy','true');
      await expect(gps).toBeDisabled();
      await expect(gps).toHaveAttribute('data-state','success');
      await expect(page.locator('.hero .actions button').nth(1)).toHaveAttribute('data-state','success');
      await page.evaluate(()=>window.__gpsMode='error');
      await gps.click();
      await expect(gps).toHaveAttribute('data-state','error');
      await expect(page.locator('.app-shell').getByRole('alert')).toContainText('No se pudo leer el GPS');
      await page.evaluate(()=>window.__gpsMode='success');
      await gps.click();
      const input=page.getByRole('combobox',{name:'Origen',exact:true});
      await input.fill('merida');
      await expect(page.getByRole('option')).toHaveCount(4);
      await input.press('Enter');
      await sleep(700);
      await expect(page.locator('.stat').first()).toContainText('Mérida');
      assert.equal(await page.evaluate(()=>window.__gpsCalls),3);
    });
    await desktop.context.close();

    const mobile=await fixturePage(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    currentPage=mobile.page;
    const m=mobile.page;
    await selectOrigin(m,true);
    await check('Móvil: acciones ocultas fuera del foco; apertura explícita y Escape',async()=>{
      const card=m.locator('#section-panel-cercanas .swipe-card').first();
      await expect(card.locator('.swipe-actions')).toHaveAttribute('inert','');
      assert.equal(await m.getByRole('link',{name:/Cómo llegar a Servicio Centro/}).count(),0);
      await card.getByRole('button',{name:/Mostrar opciones de viaje/}).tap();
      await expect(card).toHaveAttribute('data-open','true');
      await expect(card.getByRole('link',{name:/Cómo llegar/})).toBeVisible();
      await card.getByRole('link',{name:/Cómo llegar/}).focus();
      await m.keyboard.press('Escape');
      await expect(card).toHaveAttribute('data-open','false');
      await expect(card.getByRole('button',{name:/Mostrar opciones de viaje/})).toBeFocused();
    });
    await check('Móvil: swipe revela, respeta límites y bloquea el clic posterior al arrastre',async()=>{
      const card=m.locator('#section-panel-cercanas .swipe-card').first();
      await swipe(m,card.locator('h3'),-130);
      await expect(card).toHaveAttribute('data-open','true');
      const offset=await card.locator('.card-surface').evaluate(node=>new DOMMatrix(getComputedStyle(node).transform).m41);
      assert.ok(offset>=-144&&offset<=0,offset);
      const fired=await card.getByRole('link',{name:/Cómo llegar/}).evaluate(node=>{
        window.__dragClickFired=false;
        node.addEventListener('click',()=>window.__dragClickFired=true,{once:true});
        node.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
        return window.__dragClickFired;
      });
      assert.equal(fired,false,'synthetic click was blocked');
      await card.getByRole('button',{name:'Cerrar opciones de Servicio Centro',exact:true}).tap();
      await expect(card).toHaveAttribute('data-open','false');
    });
    await check('Móvil: scroll vertical y gestos sobre controles no abren ni cambian secciones',async()=>{
      const card=m.locator('#section-panel-cercanas .swipe-card').first();
      await card.locator('h3').scrollIntoViewIfNeeded();
      const initialY=await m.evaluate(()=>scrollY);
      await swipe(m,card.locator('h3'),2,-140);
      await expect(card).toHaveAttribute('data-open','false');
      assert.ok(await m.evaluate(()=>scrollY)>initialY,'vertical page scrolling is preserved');
      await swipe(m,card.getByRole('button',{name:/Mostrar opciones de viaje/}),-90);
      await expect(card).toHaveAttribute('data-open','false');
      await expect(m.getByRole('tab',{name:'Más cercanas',exact:true})).toHaveAttribute('aria-selected','true');
    });
    await check('Móvil: swipe de sección y pestaña activa visible en carril',async()=>{
      await swipe(m,m.locator('.section-swipe-hint'),-130);
      await expect(m.getByRole('tab',{name:'Más baratas',exact:true})).toHaveAttribute('aria-selected','true');
      const first=m.getByRole('tab',{name:'Más cercanas',exact:true});
      await first.focus();
      await first.press('End');
      const last=m.getByRole('tab',{name:'Comparar',exact:true});
      await expect(last).toHaveAttribute('aria-selected','true');
      await expect.poll(async()=>last.evaluate(node=>{
        const item=node.getBoundingClientRect(), rail=node.parentElement.getBoundingClientRect();
        return item.left>=rail.left-1&&item.right<=rail.right+1;
      })).toBe(true);
      await noOverflow(m);
    });
    await check('Móvil: carrusel nativo con siguiente tarjeta asomando y controles sin gestos',async()=>{
      const rail=m.locator('#section-panel-comparar .carousel-viewport');
      const sizes=await rail.evaluate(node=>({width:node.clientWidth,card:node.children[0].getBoundingClientRect().width,scroll:node.scrollWidth}));
      assert.ok(sizes.card<sizes.width&&sizes.scroll>sizes.width,JSON.stringify(sizes));
      await m.getByRole('button',{name:'Comparación de precios: tarjeta siguiente',exact:true}).tap();
      await expect.poll(async()=>rail.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
      await expect(m.getByRole('button',{name:'Comparación de precios: tarjeta anterior',exact:true})).toBeEnabled();
      await axe(m,'comparación móvil');
      await m.screenshot({path:path.join(OUTPUT, 'mobile-compare.png'),fullPage:true});
    });
    await check('Móvil: chips se desplazan sin activar opciones y actualizan desbordamiento',async()=>{
      const radio=m.getByRole('group',{name:'Radio de búsqueda',exact:true});
      await swipe(m,radio,-130);
      await expect(m.getByRole('button',{name:'8 km',exact:true})).toHaveAttribute('aria-pressed','true');
      await m.getByRole('button',{name:'25 km',exact:true}).tap();
      await expect(m.getByRole('button',{name:'25 km',exact:true})).toHaveAttribute('aria-pressed','true');
      await expect.poll(async()=>radio.evaluate(node=>node.scrollLeft>0)).toBe(true);
      await expect(radio.locator('../..')).toHaveAttribute('data-overflow-after','false');
      await noOverflow(m);
    });
    await check('Responsive: 320/360/390/768/800/1280 px sin scroll horizontal global',async()=>{
      for(const width of [320,360,390,768,800,1280]) {
        await m.setViewportSize({width,height:900});
        await noOverflow(m);
        if(width>=800) {
          const rail=m.locator('#section-panel-comparar .carousel-viewport');
          assert.equal(await rail.evaluate(node=>getComputedStyle(node).gridAutoFlow),'row');
        }
      }
      await m.setViewportSize({width:390,height:844});
    });
    await check('Móvil: el mapa conserva su paneo sin cambiar de sección',async()=>{
      await m.getByRole('tab',{name:'Mapa',exact:true}).tap();
      await m.locator('#map.leaflet-container').waitFor();
      await swipe(m,m.locator('#map'),-100);
      await expect(m.getByRole('tab',{name:'Mapa',exact:true})).toHaveAttribute('aria-selected','true');
      await noOverflow(m);
    });
    await mobile.context.close();

    const mapFailure=await fixturePage(browser);
    currentPage=mapFailure.page;
    await check('Mapa: fallo del bundle local comunicado y reintento con foco recuperado',async()=>{
      const p=mapFailure.page;
      await selectOrigin(p);
      await p.evaluate(()=>{
        Object.defineProperty(window,'L',{configurable:true,get(){throw new Error('No se pudo cargar el mapa local');}});
      });
      await p.getByRole('tab',{name:'Mapa',exact:true}).click();
      await expect(p.locator('.app-shell').getByRole('alert')).toContainText('No se pudo cargar el mapa');
      await axe(p,'fallo del mapa');
      await p.evaluate(()=>delete window.L);
      await p.getByRole('button',{name:'Reintentar mapa',exact:true}).click();
      await p.getByRole('button',{name:'Acercar mapa',exact:true}).waitFor();
      await expect(p.getByRole('region',{name:'Mapa de gasolineras',exact:true})).toBeFocused();
    });
    await mapFailure.context.close();

    const reduced=await fixturePage(browser,{viewport:{width:320,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const r=reduced.page; currentPage=r;
    await selectOrigin(r,true);
    await check('Movimiento reducido: sin animación de paneles ni scroll suave',async()=>{
      await r.evaluate(()=>{
        window.__scrollBehaviors=[];
        for(const method of ['scrollTo','scrollBy','scrollIntoView']) {
          const original=Element.prototype[method];
          Element.prototype[method]=function(options,...rest){window.__scrollBehaviors.push(options?.behavior);return original.call(this,options,...rest);};
        }
      });
      await r.getByRole('button',{name:'25 km',exact:true}).tap();
      await r.getByRole('tab',{name:'Comparar',exact:true}).tap();
      assert.equal(await r.locator('#section-panel-comparar').evaluate(node=>getComputedStyle(node).animationName),'none');
      assert.equal(await r.locator('.panel-leaving').count(),0);
      assert.equal(await r.evaluate(()=>window.__scrollBehaviors.includes('smooth')),false);
      await axe(r,'movimiento reducido');
    });
    await check('Zoom de texto 200% y objetivos táctiles sin desbordamiento',async()=>{
      await r.evaluate(()=>document.documentElement.style.fontSize='200%');
      await noOverflow(r);
      const sizes=await r.locator('.hero button').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
      assert.ok(sizes.every(s=>s.w>=44&&s.h>=44),JSON.stringify(sizes));
      await r.evaluate(()=>document.documentElement.style.fontSize='');
    });
    await reduced.context.close();

    const install=await fixturePage(browser);
    const p=install.page; currentPage=p;
    await p.addInitScript(()=>{
      window.__copies=0;
      window.__clipboardReject=false;
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{window.__copies++;await new Promise(resolve=>setTimeout(resolve,250));if(window.__clipboardReject)throw Error('denied');}}});
    });
    await p.goto(BASE+'/instalar');
    await check('Instalar: copia con estados, sin duplicados y fallback manual accesible',async()=>{
      const copy=p.getByRole('button',{name:'Copiar enlace',exact:true});
      await copy.click();
      await expect(p.getByRole('button',{name:'Copiando enlace…',exact:true})).toBeDisabled();
      await expect(p.getByRole('status').filter({hasText:'Enlace copiado'})).toBeVisible();
      assert.equal(await p.evaluate(()=>window.__copies),1);
      await p.evaluate(()=>window.__clipboardReject=true);
      await p.getByRole('button',{name:'Enlace copiado',exact:true}).click();
      await expect(p.locator('.app-shell').getByRole('alert')).toContainText('No se pudo copiar');
      const field=p.getByRole('textbox',{name:'Enlace para copiar manualmente',exact:true});
      await expect(field).toBeVisible();
      await p.getByRole('button',{name:'Seleccionar enlace',exact:true}).click();
      await expect(field).toBeFocused();
      assert.equal(await field.evaluate(n=>n.selectionEnd-n.selectionStart),BASE.length);
    });
    await check('Instalar: prompt con estado ocupado y confirmación appinstalled',async()=>{
      await p.evaluate(()=>{
        const event=new Event('beforeinstallprompt',{cancelable:true});
        window.__prompts=0;
        event.prompt=async()=>window.__prompts++;
        event.userChoice=new Promise(resolve=>window.__resolveInstall=resolve);
        window.dispatchEvent(event);
      });
      await p.getByRole('button',{name:'Instalar en este dispositivo',exact:true}).click();
      await expect(p.getByRole('button',{name:'Abriendo instalación…',exact:true})).toHaveAttribute('aria-busy','true');
      assert.equal(await p.evaluate(()=>window.__prompts),1);
      await p.evaluate(()=>window.__resolveInstall({outcome:'accepted'}));
      await expect(p.getByRole('button',{name:'Instalación aceptada',exact:true})).toBeEnabled();
      await p.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
      await expect(p.getByRole('status').filter({hasText:'GasoCerca está instalada'})).toBeVisible();
      await axe(p,'instalación');
    });
    await check('Instalar: error de prompt e instrucciones manuales sin falsa confirmación',async()=>{
      await p.evaluate(()=>{
        const event=new Event('beforeinstallprompt',{cancelable:true});
        event.prompt=async()=>{throw new Error('unavailable');};
        event.userChoice=Promise.resolve({outcome:'dismissed'});
        window.dispatchEvent(event);
      });
      const installButton=p.locator('.install-actions button').first();
      await installButton.click();
      await expect(installButton).toHaveAttribute('data-state','error');
      await expect(p.locator('.app-shell').getByRole('alert').filter({hasText:'No se pudo abrir la instalación'})).toBeVisible();
      await installButton.click();
      await expect(installButton).toHaveAttribute('data-state','idle');
      await expect(p.getByRole('status').filter({hasText:'En iPhone usa Safari'})).toBeVisible();
    });
    await check('Privacidad: foco, etiquetas y contraste; sin regresión del contenido' ,async()=>{
      await p.goto(BASE+'/privacidad');
      await expect(p.getByRole('heading',{name:'Política de privacidad',exact:true})).toBeVisible();
      await axe(p,'privacidad');
      await noOverflow(p);
    });
    await install.context.close();
    assert.deepEqual(errors,[],'No browser runtime errors');
    console.log(`\n${checks} comprobaciones de navegador aprobadas; sin errores de React/JS. APIs y teselas externas simuladas de forma determinista; Leaflet local 1.9.4.`);
  } catch(error) {
    if(currentPage&&!currentPage.isClosed()) {
      await currentPage.screenshot({path:path.join(OUTPUT, 'browser-failure.png'),fullPage:true}).catch(()=>{});
      console.log('Failure screenshot: '+path.join(OUTPUT, 'browser-failure.png'));
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
