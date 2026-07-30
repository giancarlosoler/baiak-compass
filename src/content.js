if (!globalThis.__BAIAK_ANALYZER_LOADED__) {
  globalThis.__BAIAK_ANALYZER_LOADED__ = true;
(() => {
  const DEFAULTS = {
    staminaEnabled: false,
    enterAt: 20,
    returnAt: 95,
    intervalSeconds: 10,
    savedHunt: "",
    staminaMode: "hunting",
    lastStamina: null,
    lastStatus: "Esperando",
    objective: "balance",
    riskTolerance: "normal",
    learned: {},
    sessionSamples: {},
    lastAnalysis: null,
    returnMode: "recommended",
    minImprovement: 3,
    actionLogs: [],
    huntMeasurements: {},
    huntLogos: {},
    measurementState: null,
    staminaConfirmCount: 0,
    staminaConfirmAction: "",
    staminaCooldownUntil: 0
  };

  let timer = null;
  let busy = false;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const num = v => {
    const raw=String(v??"").trim().toLowerCase();
    const mult=raw.includes("b")?1e9:raw.includes("m")?1e6:raw.includes("k")?1e3:1;
    let cleaned=raw.replace(/[^0-9,.-]/g,"");
    // Baiak usa puntos como separadores de miles: 1.848, 9.978, 536.088.086.
    // Solo conservamos un separador como decimal cuando no parece agrupación de miles.
    if(cleaned.includes(",") && cleaned.includes(".")) {
      const lastComma=cleaned.lastIndexOf(","), lastDot=cleaned.lastIndexOf(".");
      if(lastComma>lastDot) cleaned=cleaned.replace(/\./g,"").replace(",",".");
      else cleaned=cleaned.replace(/,/g,"");
    } else if(cleaned.includes(".")) {
      const parts=cleaned.split(".");
      cleaned=(parts.length>2 || (parts.length===2 && parts[1].length===3)) ? parts.join("") : cleaned;
    } else if(cleaned.includes(",")) {
      const parts=cleaned.split(",");
      cleaned=(parts.length>2 || (parts.length===2 && parts[1].length===3)) ? parts.join("") : cleaned.replace(",",".");
    }
    const n=Number(cleaned); return Number.isFinite(n)?n*mult:0;
  };
  const pct = v => num(v);
  const text = (root, sel) => root?.querySelector(sel)?.textContent?.replace(/\s+/g, " ").trim() || "";

  function visible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
  }

  const HUNT_DB = globalThis.BAIAK_HUNT_ESTIMATES || {basis:{party_average_level:340.6667},hunts:[]};
  const HUNT_DB_MAP = new Map((HUNT_DB.hunts || []).map(h => [norm(h.name), h]));

  function databaseHunts() {
    return (HUNT_DB.hunts || []).map(h => ({
      name:h.name,
      level:Number(h.level || 0),
      lean:norm(h.lean).includes("loot") ? "loot" : "exp",
      stars:Number(h.stars || 1),
      mobs:Array.isArray(h.mobs) ? h.mobs.join(", ") : String(h.mobs || ""),
      clears:Number(h.clears || 0),
      databaseEstimatedXph:Number(h.estimated_xp_h || 0),
      databaseEstimatedGoldph:Number(h.estimated_loot_h || 0),
      compatibility:h.compatibility || "",
      modelConfidence:h.model_confidence || "baja",
      image:h.image || h.icon || ""
    }));
  }


  async function addLog(textValue) {
    const st = await chrome.storage.local.get({actionLogs:[]});
    const logs = [...(st.actionLogs || []), {at:Date.now(), text:String(textValue)}].slice(-50);
    await chrome.storage.local.set({actionLogs:logs});
  }

  function getStaminaPercent() {
    const exact = document.querySelector("#stamina-pct");
    if (exact) {
      const n = num(exact.textContent);
      if (n >= 0 && n <= 100) return n;
    }
    const fill = document.querySelector("#stamina-fill");
    if (fill?.style?.width) {
      const n = num(fill.style.width);
      if (n >= 0 && n <= 100) return n;
    }
    return null;
  }

  function currentHunt() {
    return text(document, "#wave-title") || "";
  }

  // Medición de prueba solicitada: para XP solo lee los dos contadores crudos
  // mostrados por el juego. No usa XP/h del Hunt Analyzer ni XP total de Skills.
  function readMeasurementTotals() {
    const byLabel = label => {
      const wanted = norm(label);
      const rows = [...document.querySelectorAll("#panel-hunt .row, #panel-hunt .body .row")];
      const row = rows.find(r => norm(r.querySelector("span")?.textContent).includes(wanted));
      return num(row?.querySelector("b")?.textContent || 0);
    };
    return {
      xpStack: num(text(document, "#an-pend")) || byLabel("XP Stack"),
      xpGain: num(text(document, "#an-raw")) || byLabel("XP Gain"),
      loot: num(text(document, "#an-loot")) || byLabel("Loot"),
      supplies: num(text(document, "#an-supplies")) || byLabel("Supplies"),
      balance: num(text(document, "#an-balance")) || byLabel("Balance")
    };
  }

  function parseStatRows(root) {
    const out = {};
    root?.querySelectorAll(".sk-stats .sk-stat, .sk-stat").forEach(row => {
      const spans = row.querySelectorAll(":scope > span");
      if (spans.length >= 2) out[norm(spans[0].textContent)] = spans[1].textContent.trim();
    });
    return out;
  }

  function parseSkillRows(root) {
    const out = {};
    root?.querySelectorAll(".sk-skill:not(.sk-xprow)").forEach(row => {
      const label = text(row, ".sk-row span:first-child");
      const valueEl = row.querySelector(".sk-row span:last-child");
      if (!label || !valueEl) return;
      const raw = valueEl.textContent.trim();
      const baseMatch = raw.match(/-?\d[\d.]*/);
      const bonusMatch = valueEl.querySelector("b")?.textContent?.match(/[+-]?\d[\d.]*/);
      out[norm(label)] = { base: num(baseMatch?.[0]), bonus: num(bonusMatch?.[0]), total: num(baseMatch?.[0]) + num(bonusMatch?.[0]) };
    });
    return out;
  }

  function vocationKey(v) {
    const n = norm(v);
    if (n.includes("knight")) return "knight";
    if (n.includes("sorcerer")) return "sorcerer";
    if (n.includes("druid")) return "druid";
    if (n.includes("paladin")) return "paladin";
    if (n.includes("monk")) return "monk";
    return "unknown";
  }

  function parseActiveCharacter() {
    const panel = document.querySelector("#skills-panel-body");
    const active = document.querySelector("#skills-members .sk-mem.on");
    if (!panel || !active) return null;
    const title = active.getAttribute("title") || "";
    const parts = title.split(/[·•|\-]/).map(s => s.trim()).filter(Boolean);
    const vocFromTitle = parts[0] || active.dataset.vocation || "";
    const nameFromTitle = parts.slice(1).join(" ") || active.dataset.name || active.textContent.trim();
    const vocLabel = text(panel, ".sk-voc") || vocFromTitle;
    const stats = parseStatRows(panel);
    const skills = parseSkillRows(panel);
    const bonuses = {};
    panel.querySelectorAll(".sk-bonuses .sk-stat").forEach(row => {
      const spans = row.querySelectorAll(":scope > span");
      if (spans.length >= 2) bonuses[norm(spans[0].textContent)] = pct(spans[1].textContent);
    });
    return {
      name: nameFromTitle || active.textContent.trim(),
      vocation: vocLabel,
      vocationKey: vocationKey(vocLabel),
      level: num(stats.level || stats.nivel),
      xp: num(stats.xp || stats.experience || stats.experiencia),
      xpPercent: num(text(panel, "#sk-xp-pct") || text(panel, ".sk-xprow .sk-row span:last-child")),
      xpToNext: num(panel.querySelector(".sk-xprow")?.getAttribute("title") || 0),
      hp: num(stats["hit points"] || stats.hp || stats.vida), mana: num(stats.mana),
      capacity: num(stats.capacity || stats.capacidade), tactics: String(stats.tactics || stats.taticas || ""), skills, bonuses
    };
  }

  async function captureParty() {
    const buttons = [...document.querySelectorAll("#skills-members .sk-mem")];
    if (!buttons.length) {
      const one = parseActiveCharacter();
      return one ? [one] : [];
    }
    const original = buttons.findIndex(b => b.classList.contains("on"));
    const party = [];
    for (const b of buttons) {
      const expectedTitle = b.getAttribute("title") || b.textContent.trim();
      const expectedParts = expectedTitle.split(/[·•|\-]/).map(v=>v.trim()).filter(Boolean);
      const expectedName = norm(expectedParts.slice(1).join(" "));
      const before = text(document, "#skills-panel-body");
      b.click();

      for (let tries=0; tries<25; tries++) {
        await sleep(120);
        const selected=document.querySelector("#skills-members .sk-mem.on");
        const selectedTitle=selected?.getAttribute("title")||selected?.textContent.trim()||"";
        const panelText=text(document, "#skills-panel-body");
        const activeOk=selected===b || norm(selectedTitle)===norm(expectedTitle);
        const contentChanged=panelText && (panelText!==before || tries>8);
        if(activeOk && contentChanged) {
          const parsed=parseActiveCharacter();
          if(parsed && (!expectedName || norm(parsed.name)===expectedName)) break;
        }
      }
      const c = parseActiveCharacter();
      if (c && c.name && !party.some(x => norm(x.name) === norm(c.name))) party.push(c);
    }
    if (original >= 0 && buttons[original]) { buttons[original].click(); await sleep(300); }
    return party;
  }

  function validCanvasCapture(canvas) {
    try {
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      const px=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let visiblePixels=0, colorEnergy=0;
      for(let i=0;i<px.length;i+=4){
        if(px[i+3]>12){ visiblePixels++; colorEnergy+=px[i]+px[i+1]+px[i+2]; }
      }
      return visiblePixels>18 && colorEnergy>450;
    } catch(_) { return true; }
  }

  function captureHuntLogo(row) {
    try {
      const candidates=[...row.querySelectorAll("canvas")].filter(c=>c.width&&c.height);
      for(const c of candidates){
        const out=document.createElement("canvas"); out.width=64; out.height=64;
        const ctx=out.getContext("2d",{willReadFrequently:true}); ctx.clearRect(0,0,64,64);
        const scale=Math.min(60/c.width,60/c.height);
        const w=Math.max(1,c.width*scale),h=Math.max(1,c.height*scale);
        ctx.drawImage(c,(64-w)/2,(64-h)/2,w,h);
        if(validCanvasCapture(out)) return out.toDataURL("image/png");
      }
      const image=[...row.querySelectorAll("img")].find(img=>{
        const src=String(img.currentSrc||img.src||"");
        const cls=String(img.className||"");
        return src && !/star|active|inactive|arrow|button|close/i.test(src+" "+cls);
      });
      return image ? String(image.currentSrc||image.src||"") : "";
    } catch(_) { return ""; }
  }

  function usableHuntImage(value, {persistent=false} = {}) {
    const src=String(value||"").trim();
    if(!src) return "";
    // blob: funciona sólo durante la página actual y no debe reemplazar una imagen persistente.
    if(persistent && /^blob:/i.test(src)) return "";
    return /^(data:image\/|https?:\/\/|blob:)/i.test(src) ? src : "";
  }

  function preferredHuntImage(...values) {
    for(const value of values){
      const src=usableHuntImage(value);
      if(src) return src;
    }
    return "";
  }

  function parseHunts(storedLogos = {}) {
    const rows=[...document.querySelectorAll(".stage-row")].map(row => {
      const name = text(row, ".stage-name-line b");
      const level = num(text(row, ".stage-lvl"));
      const lean = norm(text(row, ".stage-lean")).includes("loot") ? "loot" : "exp";
      const stars = [...row.querySelectorAll(".stage-stars img")].filter(i => /active/.test(i.src) && !/inactive/.test(i.src)).length || 1;
      const mobs = text(row, ".stage-mobs");
      const clears = num(text(row, ".stage-done"));
      const db=HUNT_DB_MAP.get(norm(name));
      const imageEl = row.querySelector(".stage-icon img, .stage-img img, img.stage-icon, img.stage-img, .hunt-icon img, .hunt-image img, img[src*='hunt'], img[src*='monster'], img[src*='stage']") ||
        [...row.querySelectorAll("img")].find(img => !/star|active|inactive|arrow|button/i.test((img.currentSrc||img.src||"") + " " + img.className));
      const capturedLogo = captureHuntLogo(row);
      return {
        name, level:level || Number(db?.level || 0), lean:db ? (norm(db.lean).includes("loot") ? "loot" : "exp") : lean,
        stars:stars || Number(db?.stars || 1), mobs:mobs || (Array.isArray(db?.mobs)?db.mobs.join(", "):""), clears,
        databaseEstimatedXph:Number(db?.estimated_xp_h || 0), databaseEstimatedGoldph:Number(db?.estimated_loot_h || 0),
        compatibility:db?.compatibility || "", modelConfidence:db?.model_confidence || "baja",
        // La caché persistente tiene prioridad sobre URLs blob temporales.
        image:preferredHuntImage(capturedLogo, storedLogos[norm(name)], imageEl?.currentSrc, imageEl?.src, db?.image, db?.icon)
      };
    }).filter(h => h.name && h.level >= 0);
    if (!rows.length) return databaseHunts().map(h => ({...h, image:storedLogos[norm(h.name)] || h.image || ""}));
    const names=new Set(rows.map(h=>norm(h.name)));
    for(const h of databaseHunts()) if(!names.has(norm(h.name))) rows.push({...h,image:storedLogos[norm(h.name)] || h.image || ""});
    return rows;
  }

  async function saveCapturedHuntLogos(hunts, previous = {}) {
    const logos={...(previous||{})};
    let added=0;
    for(const h of hunts||[]){
      const key=norm(h.name);
      const img=usableHuntImage(h.image,{persistent:true});
      // Nunca reemplazar una imagen válida por una URL blob temporal o un valor vacío.
      if(!key || !img) continue;
      if(logos[key]!==img){ logos[key]=img; added++; }
    }
    if(added){
      await chrome.storage.local.set({huntLogos:logos});
      await addLog(`Logos de hunts guardados: +${added} (total ${Object.keys(logos).length}).`);
    }
    return logos;
  }

  function huntModalVisible() {
    const modal=document.querySelector("#picker-modal");
    if(!modal) return false;
    const cs=getComputedStyle(modal);
    return !modal.classList.contains("hidden") && cs.display!=="none" && cs.visibility!=="hidden";
  }

  function installHuntScanMask() {
    let style=document.querySelector("#baiak-compass-hunt-scan-style");
    if(!style){
      style=document.createElement("style");
      style.id="baiak-compass-hunt-scan-style";
      style.textContent=`body.baiak-compass-hunt-scan #picker-modal{position:fixed!important;left:-12000px!important;top:-12000px!important;opacity:0!important;pointer-events:none!important;visibility:visible!important;display:block!important;z-index:-2147483647!important}`;
      document.documentElement.appendChild(style);
    }
    document.body.classList.add("baiak-compass-hunt-scan");
  }

  function removeHuntScanMask() {
    document.body.classList.remove("baiak-compass-hunt-scan");
  }

  async function selectAllHuntCategories() {
    const all=[...document.querySelectorAll("#picker-modal .sp-cat")]
      .find(el=>/^all(?:\s|$)/i.test(String(el.textContent||"").trim()));
    if(all && !all.classList.contains("on")){
      all.click();
      for(let i=0;i<20;i++){
        await sleep(100);
        if(document.querySelectorAll("#picker-modal .stage-row").length>10) break;
      }
    }
    const search=document.querySelector("#picker-modal .pick-search");
    if(search && search.value){
      search.value="";
      search.dispatchEvent(new Event("input",{bubbles:true}));
      search.dispatchEvent(new Event("change",{bubbles:true}));
      await sleep(180);
    }
  }

  async function captureAllVisibleHuntLogos() {
    const wasOpen=huntModalVisible();
    if(!wasOpen) installHuntScanMask();
    try{
      await openHuntSelector();
      await selectAllHuntCategories();

      const st=await chrome.storage.local.get({huntLogos:{}});
      let logos={...(st.huntLogos||{})};
      const capturedByName=new Map();

      const captureStep=async()=>{
        // El juego dibuja los monstruos en canvas; esperar dos frames evita capturas vacías.
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        await sleep(180);
        const rows=[...document.querySelectorAll("#picker-modal .stage-row")];
        const parsed=parseHunts(logos).filter(h=>h.name);
        for(const h of parsed){
          const key=norm(h.name);
          const previous=capturedByName.get(key);
          if(h.image || !previous) capturedByName.set(key,{...(previous||{}),...h,image:preferredHuntImage(h.image,previous?.image,logos[key])});
        }
        logos=await saveCapturedHuntLogos(parsed,logos);
        return rows.length;
      };

      const scrollers=[...document.querySelectorAll("#picker-modal .sp-list, #picker-modal .hunt-grid, #picker-modal-body, #picker-modal .modal-body")]
        .filter(el=>el.scrollHeight>el.clientHeight+8)
        .sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight));
      const scroller=scrollers[0];

      if(scroller){
        const start=scroller.scrollTop;
        const max=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
        const step=Math.max(90,Math.floor(scroller.clientHeight*.45));
        for(let y=0;y<=max;y+=step){
          scroller.scrollTop=Math.min(y,max);
          scroller.dispatchEvent(new Event("scroll",{bubbles:true}));
          await captureStep();
        }
        if(scroller.scrollTop!==max){
          scroller.scrollTop=max;
          scroller.dispatchEvent(new Event("scroll",{bubbles:true}));
          await captureStep();
        }
        scroller.scrollTop=start;
        scroller.dispatchEvent(new Event("scroll",{bubbles:true}));
        await captureStep();
      } else {
        // Reintentar varias veces, igual que el detector de Bosses, hasta que los canvas estén dibujados.
        for(let i=0;i<12;i++){
          await captureStep();
          const total=document.querySelectorAll("#picker-modal .stage-row").length;
          const withImages=[...capturedByName.values()].filter(h=>usableHuntImage(h.image,{persistent:true})).length;
          if(total && withImages>=total) break;
        }
      }

      // Segunda pasada para filas virtualizadas o canvas que aparecieron tarde.
      for(let i=0;i<8;i++){
        await captureStep();
        const total=document.querySelectorAll("#picker-modal .stage-row").length;
        const withImages=[...capturedByName.values()].filter(h=>usableHuntImage(h.image,{persistent:true})).length;
        if(total && withImages>=total) break;
      }

      const hunts=databaseHunts().map(h=>{
        const key=norm(h.name);
        const captured=capturedByName.get(key);
        return {
          ...h,
          ...(captured||{}),
          image:preferredHuntImage(captured?.image,logos[key],h.image,h.icon)
        };
      });
      return {captured:Object.keys(logos).length,hunts};
    } finally {
      if(!wasOpen) await closeHuntPickerConfirmed();
      removeHuntScanMask();
    }
  }


  function b(c, key) { return c.bonuses?.[key] || 0; }
  function s(c, key) { return c.skills?.[key]?.total || 0; }

  function characterPower(c) {
    const crit = b(c, "crit chance") * (1 + b(c, "crit damage") / 100);
    const sustain = b(c, "life leech") + b(c, "mana leech") * .45;
    const attackSpeed = b(c, "attack speed");
    let offense = c.level * .35 + crit * 1.6 + attackSpeed * 1.3 + b(c, "attack") * 1.8;
    let defense = c.hp / 70 + b(c, "max hp") * 1.5 + sustain * 1.5 + s(c, "shielding") * .45;
    if (c.vocationKey === "knight") offense += s(c, "melee") * 2.2;
    else if (c.vocationKey === "monk") offense += s(c, "fist") * 2.2;
    else if (c.vocationKey === "paladin") offense += s(c, "distance") * 2.2;
    else offense += s(c, "magic") * 2.25 + b(c, "spell damage") * 2.0 + Math.max(b(c,"damage fire"),b(c,"damage ice"),b(c,"damage earth"),b(c,"damage energy"),b(c,"damage death"),b(c,"damage holy")) * 1.1;
    if (c.vocationKey === "druid") defense += b(c, "spell healing") * 2 + s(c, "magic") * .35;
    return { offense, defense };
  }

  function partySignature(party) {
    return party.map(c => `${c.name}:${c.vocationKey}:${c.level}:${s(c,"magic")}:${s(c,"melee")}:${s(c,"distance")}:${s(c,"fist")}`).sort().join("|");
  }

  function scoreHunt(h, party, settings, learned) {
    const powers=party.map(characterPower);
    const avgLevel=party.reduce((a,c)=>a+c.level,0)/Math.max(1,party.length);
    const totalOff=powers.reduce((a,p)=>a+p.offense,0);
    const totalDef=powers.reduce((a,p)=>a+p.defense,0);
    const capacity=avgLevel*(0.88+Math.min(.55,totalOff/Math.max(1,party.length)/850))*(1+Math.max(0,party.length-1)*.18);
    const ratio=h.level/Math.max(1,capacity);
    const risk=Math.max(1,Math.min(100,(ratio-.68)*150+h.stars*4-totalDef/Math.max(1,party.length)/20));
    const efficiency=Math.exp(-Math.pow((h.level-capacity*.84)/Math.max(55,capacity*.48),2));
    const partyBase=Math.max(250000,avgLevel*totalOff*Math.max(1,party.length)*4.2);
    const levelFactor=Math.pow(Math.max(30,h.level)/Math.max(30,avgLevel),.72);
    const referenceLevel=Number(HUNT_DB.basis?.party_average_level || 340.6667);
    const partyScale=Math.pow(Math.max(0.18,avgLevel/referenceLevel),0.82)*Math.pow(Math.max(1,party.length)/3,0.70);
    const dbXph=Number(h.databaseEstimatedXph || 0);
    const dbGold=Number(h.databaseEstimatedGoldph || 0);
    // El análisis estimado original es fijo y nunca se sobrescribe ni se recalibra.
    const baseEstimatedXph=dbXph || partyBase*efficiency*levelFactor*(h.lean==='exp'?1.18:.92);
    const baseEstimatedGoldph=dbGold || baseEstimatedXph*(h.lean==='loot'?.095:.052);
    // La adaptación a la party se conserva aparte para el score interno, sin cambiar lo mostrado.
    const compatibilityFactor=Math.max(.22,Math.min(1.08,efficiency*.88+.20));
    const partyAdjustedXph=baseEstimatedXph*partyScale*compatibilityFactor;
    const partyAdjustedGoldph=baseEstimatedGoldph*partyScale*Math.max(.42,compatibilityFactor);
    const estimatedXph=baseEstimatedXph;
    const estimatedGoldph=baseEstimatedGoldph;
    const entry=learned[h.name];
    const measurement=settings.huntMeasurements?.[h.name];
    const sameBuild=entry && (!entry.partySignature || entry.partySignature===partySignature(party));
    const calibratedXph=Number(measurement?.calibratedExpectedXph || (sameBuild?entry.xph:0) || 0);
    const calibratedGoldph=Number(measurement?.calibratedExpectedGoldph || (sameBuild?entry.goldph:0) || 0);
    const calibration=Number(measurement?.totalSessions ? Math.min(100, measurement.totalSessions*20) : (sameBuild?entry.calibration:0) || 0);
    // Recomendación híbrida: una ventana completa de 5 minutos basta para usar el promedio real.
    // Hasta entonces se mantiene la estimación base para que el Advisor nunca quede vacío.
    const hasRealMeasurement=Number(measurement?.totalSessions||measurement?.sessions?.length||0)>0;
    const displayXph=hasRealMeasurement?Number(measurement?.avgXph||0):estimatedXph;
    const displayGoldph=hasRealMeasurement?Number(measurement?.avgGoldph||0):estimatedGoldph;
    const riskPenalty=settings.riskTolerance==='safe'?risk*1.25:settings.riskTolerance==='aggressive'?risk*.55:risk*.9;
    const nx=Math.log10(Math.max(10,partyAdjustedXph)), ng=Math.log10(Math.max(10,partyAdjustedGoldph));
    let raw=settings.objective==='xp'?nx*18+ng*3:settings.objective==='gold'?ng*18+nx*3:nx*11+ng*10;
    raw-=riskPenalty*.32; if(ratio>1.35)raw-=(ratio-1.35)*70;
    return {...h,scoreRaw:raw,risk:Math.round(risk),estimatedXph:Math.round(estimatedXph),estimatedGoldph:Math.round(estimatedGoldph),calibratedXph:Math.round(calibratedXph),calibratedGoldph:Math.round(calibratedGoldph),displayXph:Math.round(displayXph),displayGoldph:Math.round(displayGoldph),xph:Math.round(displayXph),goldph:Math.round(displayGoldph),calibration,partyAdjustedXph:Math.round(partyAdjustedXph),partyAdjustedGoldph:Math.round(partyAdjustedGoldph),source:'estimada-base'};
  }

  function normalizeScores(rows) {
    const vals = rows.map(r=>r.scoreRaw), min=Math.min(...vals), max=Math.max(...vals);
    return rows.map(r=>({...r, score: Math.round((max===min?70:55+(r.scoreRaw-min)/(max-min)*44)*10)/10})).sort((a,b)=>b.score-a.score);
  }

  function readSession() {
    return {
      hunt: currentHunt(),
      xph: num(text(document,"#an-xph")),
      loot: num(text(document,"#an-loot")),
      goldph: num(text(document,"#loot-perhour")),
      supplies: num(text(document,"#sup-gold")),
      balance: num(text(document,"#an-balance")) || Math.max(0,num(text(document,"#an-loot"))-num(text(document,"#sup-gold"))),
      kills: num(text(document,"#an-kills")),
      session: text(document,"#an-session") || text(document,"#loot-session")
    };
  }

  function secondsFromClock(v) {
    const a=String(v||"").split(":").map(Number); if(a.some(x=>!Number.isFinite(x))) return 0;
    return a.reduce((acc,x)=>acc*60+x,0);
  }

  async function learnCurrentSession(party) {
    const sess=readSession();
    const seconds=secondsFromClock(sess.session);
    if(!sess.hunt || norm(sess.hunt)==='online training' || seconds<15 || !sess.xph) return;
    const st=await chrome.storage.local.get(DEFAULTS);
    const learned={...(st.learned||{})};
    const sig=partySignature(party);
    let old=learned[sess.hunt];
    if(!old || (old.partySignature && old.partySignature!==sig)) old={samples:0,xph:0,goldph:0,maxSeconds:0,calibration:0};
    const n=(old.samples||0)+1;
    const alpha=Math.max(.08,Math.min(.35,1/Math.sqrt(n)));
    const xph=Math.round(old.xph?old.xph*(1-alpha)+sess.xph*alpha:sess.xph);
    const gp=sess.goldph||sess.balance||0;
    const goldph=Math.round(old.goldph?old.goldph*(1-alpha)+gp*alpha:gp);
    const maxSeconds=Math.max(old.maxSeconds||0,seconds);
    const calibration=Math.min(100,Math.round(maxSeconds/1200*100));
    learned[sess.hunt]={samples:n,xph,goldph,maxSeconds,calibration,partySignature:sig,updatedAt:Date.now()};
    await chrome.storage.local.set({learned});
  }

  async function analyze() {
    const teleportState=rememberTeleportUiState();
    let huntCatalog=null;
    try{ huntCatalog=await captureAllVisibleHuntLogos(); }
    finally{ await restoreTeleportUiState(teleportState); }
    const party=await captureParty();
    const fresh=await chrome.storage.local.get(DEFAULTS);
    const hunts=(huntCatalog?.hunts?.length?huntCatalog.hunts:parseHunts(fresh.huntLogos||{})).map(h=>({
      ...h,
      image:preferredHuntImage(h.image,fresh.huntLogos?.[norm(h.name)])
    }));
    await saveCapturedHuntLogos(hunts,fresh.huntLogos||{});
    if(!party.length) throw new Error("No pude leer los personajes de la party. Espera que cargue el panel Skills y vuelve a intentar.");
    if(!hunts.length) throw new Error("No pude cargar las hunts ni la base interna.");
    const ranked=normalizeScores(hunts.map(h=>scoreHunt(h,party,fresh,fresh.learned||{})));
    const result={at:Date.now(),party,ranked,currentSession:readSession(),objective:fresh.objective,riskTolerance:fresh.riskTolerance,estimateModel:HUNT_DB.model||"heuristic-v1",estimateWarning:HUNT_DB.warning||""};
    await chrome.storage.local.set({lastAnalysis:result});
    return result;
  }

  function clickable() { return [...document.querySelectorAll("button,a,[role=button],[onclick]")].filter(visible); }
  function findClick(label) { const n=norm(label); return clickable().find(e=>norm(e.textContent)===n)||clickable().find(e=>norm(e.textContent).includes(n)); }

  function visibleStageRows() { return [...document.querySelectorAll(".stage-row")].filter(visible); }

  function teleportMenuIsOpen() {
    const wave=document.querySelector("#wave-title");
    const aria=String(wave?.getAttribute("aria-expanded")||"").toLowerCase();
    if(aria==="true") return true;
    if(aria==="false") return false;

    const labels=["city","online training","offline training","hunts","offline hunt","bosses"];
    const nodes=[...document.querySelectorAll("button,a,[role='button'],li,[role='menuitem'],.menu-item,.teleport-item")].filter(visible);
    let matches=0;
    for(const label of labels){
      if(nodes.some(el=>norm(el.textContent)===label)) matches++;
    }
    // Dos opciones visibles ya prueban que el desplegable está abierto y evita depender del texto completo.
    return matches>=2;
  }

  function huntPickerIsOpen() {
    const modal=document.querySelector("#picker-modal");
    return !!(modal && visible(modal));
  }

  function rememberTeleportUiState() {
    return { menuOpen:teleportMenuIsOpen(), pickerOpen:huntPickerIsOpen() };
  }

  async function closeHuntPickerConfirmed() {
    for(let i=0;i<5 && huntPickerIsOpen();i++){
      const close=[...document.querySelectorAll("#picker-modal .mp-close, #picker-modal [aria-label='Close'], #picker-modal [aria-label='Cerrar'], #picker-modal .im-close, #picker-modal button")]
        .filter(visible)
        .find(el=>/close|cerrar|×|✕/i.test(String(el.getAttribute('aria-label')||el.title||el.textContent||''))) ||
        [...document.querySelectorAll("#picker-modal .mp-close, #picker-modal .im-close")].find(visible);
      if(close) close.click();
      else document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true}));
      await sleep(220);
    }
  }

  async function setTeleportMenuOpen(shouldOpen) {
    const wave=document.querySelector("#wave-title");
    if(!wave) return false;
    for(let i=0;i<5;i++){
      const current=teleportMenuIsOpen();
      if(current===!!shouldOpen) return true;
      wave.click();
      await sleep(260);
    }
    return teleportMenuIsOpen()===!!shouldOpen;
  }

  async function restoreTeleportUiState(before={menuOpen:false,pickerOpen:false}) {
    // Primero cierra el selector de Hunts/Bosses que abrió la extensión.
    if(!before.pickerOpen && huntPickerIsOpen()) await closeHuntPickerConfirmed();
    // Después restaura y confirma el estado real del menú Teleporting.
    await setTeleportMenuOpen(!!before.menuOpen);
  }

  function closeTeleportUi() {
    const close=[...document.querySelectorAll("#picker-modal .mp-close, #picker-modal [aria-label='Close'], #picker-modal .im-close, .mp-close, .im-close")].find(visible);
    if(close){ close.click(); return; }
    const modal=document.querySelector("#picker-modal");
    if(modal && visible(modal)) document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",code:"Escape",bubbles:true}));
    if(teleportMenuIsOpen()) document.querySelector("#wave-title")?.click();
  }

  async function openHuntSelector() {
    if (visibleStageRows().length) return true;
    const wave=document.querySelector("#wave-title");
    if(!wave) throw new Error("No encontré el menú Teleports.");
    wave.click();
    await sleep(250);
    let hunts=findClick("Hunts");
    if(!hunts){
      const candidates=[...document.querySelectorAll("button,a,[role=button],li,div")].filter(visible);
      hunts=candidates.find(el=>norm(el.textContent)==="hunts");
    }
    if(!hunts) throw new Error("Abrí Teleports, pero no encontré la opción Hunts.");
    hunts.click();
    for(let i=0;i<20;i++){ await sleep(150); if(visibleStageRows().length) return true; }
    throw new Error("La lista de hunts no terminó de abrir.");
  }

  async function ensureHuntsLoaded() {
    const teleportState=rememberTeleportUiState();
    try { await openHuntSelector(); return true; }
    finally { await restoreTeleportUiState(teleportState); }
  }

  async function switchToHunt(name) {
    try {
      await openHuntSelector();
      const row=visibleStageRows().find(r=>norm(text(r,".stage-name-line b"))===norm(name));
      const go=row?.querySelector(".stage-go");
      if(!go) throw new Error(`No se encontró la hunt ${name}.`);
      if(go.disabled && norm(currentHunt())===norm(name)) return true;
      go.scrollIntoView({block:"center",inline:"center"});
      go.click();
      const wanted=norm(name);
      for(let i=0;i<24;i++){
        await sleep(250);
        if(norm(currentHunt())===wanted) return true;
      }
      throw new Error(`Se pulsó ${name}, pero el juego no confirmó el cambio.`);
    } finally {
      closeTeleportUi();
    }
  }

  async function enterTraining() {
    const hunt=currentHunt();
    if(hunt && norm(hunt)!=="online training") await chrome.storage.local.set({savedHunt:hunt});
    // El acceso a Online Training está dentro del selector que abre #wave-title.
    // Primero intentamos una opción que ya esté visible; si no existe, abrimos el selector.
    let btn=findClick("Online Training") || findClick("Treino online");
    if(!btn){
      const wave=document.querySelector("#wave-title");
      if(!wave) throw new Error("No encontré el selector de teleports (#wave-title).");
      wave.click();
      wave.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));
      await sleep(800);
      btn=findClick("Online Training") || findClick("Treino online");
    }
    if(!btn){
      // Búsqueda adicional por texto o atributos, por si la opción no es button/a.
      const candidates=[...document.querySelectorAll("body *")].filter(visible);
      btn=candidates.find(el=>{
        const hay=norm([el.textContent,el.getAttribute("title"),el.getAttribute("data-tip"),el.getAttribute("aria-label")].filter(Boolean).join(" "));
        return hay.includes("online training") || hay.includes("treino online");
      });
    }
    if(!btn) throw new Error("Abrí el selector, pero no encontré la opción Online Training.");
    btn.scrollIntoView({block:"center",inline:"center"});
    btn.click();
    btn.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));
    for(let i=0;i<20;i++){
      await sleep(250);
      if(norm(currentHunt())==="online training") break;
    }
    if(norm(currentHunt())!=="online training") throw new Error("El juego no confirmó la entrada a Online Training.");
    await chrome.storage.local.set({staminaMode:"training",staminaCooldownUntil:Date.now()+15000,lastStatus:`Umbral alcanzado. Online Training activado (${getStaminaPercent()}% ≤ límite).`});
    await addLog(`Stamina ${getStaminaPercent()}%: entrando a Online Training desde ${hunt || "hunt desconocida"}.`);
  }

  async function returnAfterTraining(settings) {
    const previous = settings.savedHunt || "";
    if (settings.returnMode === "notify") {
      let analysis = settings.lastAnalysis;
      try { analysis = await analyze(); } catch (_) {}
      const recommended = analysis?.ranked?.[0]?.name || previous || "sin recomendación";
      await chrome.storage.local.set({staminaMode:"hunting",lastStatus:`Stamina recuperada. Recomendación: ${recommended}. Cambio automático desactivado.`});
      await addLog(`Stamina recuperada: se recomienda ${recommended}; no se cambió automáticamente.`);
      return;
    }
    if (settings.returnMode === "previous") {
      if(!previous) throw new Error("No hay una hunt guardada.");
      await switchToHunt(previous);
      await chrome.storage.local.set({staminaMode:"hunting",lastStatus:`Regresando a ${previous}…`});
      await addLog(`Stamina recuperada: regreso a la hunt anterior ${previous}.`);
      return;
    }
    let analysis;
    try { analysis = await analyze(); }
    catch (_) { analysis = settings.lastAnalysis; }
    const ranked = analysis?.ranked || [];
    const best = ranked[0];
    const previousRow = ranked.find(r => norm(r.name) === norm(previous));
    let target = best?.name || previous;
    if (best && previousRow && norm(best.name) !== norm(previous)) {
      const improvement = ((best.score - previousRow.score) / Math.max(1, previousRow.score)) * 100;
      if (improvement < Number(settings.minImprovement || 0)) target = previous;
    }
    if (!target) throw new Error("No se encontró una hunt recomendada ni una hunt anterior.");
    try {
      await switchToHunt(target);
    } catch (e) {
      if (previous && norm(target) !== norm(previous)) {
        await switchToHunt(previous);
        target = previous;
      } else throw e;
    }
    await chrome.storage.local.set({staminaMode:"hunting",lastStatus:`Stamina recuperada. Entrando a ${target}…`});
    await addLog(`Stamina recuperada: analizador eligió ${target}${best?.name === target ? " como mejor hunt" : " por mejora mínima/respaldo"}.`);
  }

  async function staminaTick() {
    if(busy) return; busy=true;
    try {
      const st=await chrome.storage.local.get(DEFAULTS);
      const stamina=getStaminaPercent();
      const hunt=currentHunt();
      const actuallyTraining=norm(hunt)==="online training";
      const training=actuallyTraining;
      const now=Date.now();

      // Corrige estados antiguos después de F5 o cambios manuales.
      if(st.staminaMode!== (training?"training":"hunting")) {
        await chrome.storage.local.set({staminaMode:training?"training":"hunting"});
      }
      const baseStatus=!st.staminaEnabled?"Auto Stamina pausado":stamina==null?"No se pudo leer stamina":training?`Training: ${stamina}%`:`Cazando en ${hunt||"?"}: ${stamina}%`;
      await chrome.storage.local.set({lastStamina:stamina,lastStatus:baseStatus});
      if(!st.staminaEnabled||stamina==null) return;
      if(now < Number(st.staminaCooldownUntil||0)) return;

      let wanted="";
      if(!training && stamina<=Number(st.enterAt)) wanted="enter";
      else if(training && stamina>=Number(st.returnAt)) wanted="return";

      if(!wanted){
        if(st.staminaConfirmCount||st.staminaConfirmAction) await chrome.storage.local.set({staminaConfirmCount:0,staminaConfirmAction:""});
        return;
      }

      // Exige dos lecturas consecutivas para evitar cambios por una lectura momentánea.
      const count=st.staminaConfirmAction===wanted?Number(st.staminaConfirmCount||0)+1:1;
      await chrome.storage.local.set({staminaConfirmAction:wanted,staminaConfirmCount:count,lastStatus:`Confirmando stamina (${count}/2)…`});
      if(count<2) return;
      await chrome.storage.local.set({staminaConfirmAction:"",staminaConfirmCount:0,staminaCooldownUntil:now+30000});

      if(wanted==="enter") {
        await chrome.storage.local.set({lastStatus:`Stamina ${stamina}% ≤ ${Number(st.enterAt)}%. Activando Online Training…`});
        await enterTraining();
      } else {
        await chrome.storage.local.set({lastStatus:`Stamina ${stamina}% ≥ ${Number(st.returnAt)}%. Preparando regreso…`});
        await returnAfterTraining(st);
        await chrome.storage.local.set({staminaCooldownUntil:Date.now()+20000});
      }
    } catch (e) {
      await chrome.storage.local.set({lastStatus:`Error Auto Stamina: ${e.message}`,staminaCooldownUntil:Date.now()+15000});
      await addLog(`Error Auto Stamina: ${e.message}`);
    } finally { busy=false; }
  }

  const MEASURE_MS = 5 * 60 * 1000;
  let measurementTimer = null;

  function createMeasurementState(hunt, totals, now) {
    return {
      hunt,startAt:now,lastAt:now,windowStartAt:now,elapsedMs:0,
      xpGained:0,windowXpGain:0,cumulativeXpGain:0,
      goldGained:0,suppliesSpent:0,profitGained:0,
      sessionGoldGained:0,sessionSuppliesSpent:0,sessionProfitGained:0,
      startXpStack:totals.xpStack,startXpGain:totals.xpGain,lastRawXpGain:totals.xpGain,
      windowStartLoot:totals.loot,windowStartSupplies:totals.supplies,windowStartBalance:totals.balance,
      currentXpStack:totals.xpStack,rawXpStack:totals.xpStack,rawXpGain:totals.xpGain,
      rawLoot:totals.loot,rawSupplies:totals.supplies,rawBalance:totals.balance,
      realXph:0,realGoldph:0,status:"running",targetMs:MEASURE_MS,updatedAt:now,
      source:"xp-gain-and-hunt-analyzer-gold"
    };
  }

  async function measurementTick() {
    const hunt = currentHunt();
    const normalized = norm(hunt);
    const now = Date.now();
    const totals = readMeasurementTotals();
    const st = await chrome.storage.local.get(DEFAULTS);
    let state = st.measurementState;

    if (!hunt || normalized === "online training") {
      if (state?.status === "running") await chrome.storage.local.set({measurementState:{...state,status:"paused",pausedAt:now,updatedAt:now}});
      return;
    }

    // La medición no se reinicia al terminar una wave, matar un boss ni cuando
    // los contadores internos del juego vuelven a cero. Solo comienza una nueva
    // sesión cuando cambia realmente la hunt. Los reinicios de XP Gain se
    // absorben más abajo mediante deltas positivos.
    if (!state || norm(state.hunt) !== normalized) {
      state = createMeasurementState(hunt, totals, now);
      await chrome.storage.local.set({measurementState:state});
      await addLog(`Medición continua iniciada en ${hunt}. La ventana solo se reinicia al completar 5 minutos o cambiar de hunt.`);
      return;
    }

    if (state.status === "paused") {
      const pausedFor=Math.max(0,now-Number(state.pausedAt||now));
      state = {...state,status:"running",lastAt:now,lastRawXpGain:totals.xpGain,
        windowStartAt:Number(state.windowStartAt||now)+pausedFor,pausedAt:0,
        windowStartLoot:totals.loot-Number(state.goldGained||0),
        windowStartSupplies:totals.supplies-Number(state.suppliesSpent||0),
        windowStartBalance:totals.balance-Number(state.profitGained||0)};
    }

    // La ventana se calcula con tiempo real desde windowStartAt. De esta forma
    // continúa aunque el popup de Baiak Compass se cierre o el navegador reduzca timers.
    const elapsedMs = Math.max(0, now - Number(state.windowStartAt || now));

    // XP Gain del juego: suma deltas positivos y soporta reinicios del contador.
    const lastRawXpGain = Number(state.lastRawXpGain ?? totals.xpGain);
    let xpGainDelta = totals.xpGain >= lastRawXpGain ? totals.xpGain - lastRawXpGain : totals.xpGain;
    if (!Number.isFinite(xpGainDelta) || xpGainDelta < 0 || xpGainDelta > 1e10) xpGainDelta = 0;
    const windowXpGain = Number(state.windowXpGain ?? state.xpGained ?? 0) + xpGainDelta;
    const cumulativeXpGain = Number(state.cumulativeXpGain || 0) + xpGainDelta;

    // Gold de la ventana actual; los acumulados de sesión se consolidan al cerrar cada ventana.
    const goldGained = Math.max(0, totals.loot - Number(state.windowStartLoot ?? totals.loot));
    const suppliesSpent = Math.max(0, totals.supplies - Number(state.windowStartSupplies ?? totals.supplies));
    const profitGained = Math.max(0, totals.balance - Number(state.windowStartBalance ?? totals.balance));

    state = {...state,lastAt:now,elapsedMs,xpGained:windowXpGain,windowXpGain,cumulativeXpGain,
      goldGained,suppliesSpent,profitGained,lastRawXpGain:totals.xpGain,
      currentXpStack:totals.xpStack,rawXpStack:totals.xpStack,rawXpGain:totals.xpGain,
      rawLoot:totals.loot,rawSupplies:totals.supplies,rawBalance:totals.balance,
      updatedAt:now,status:"running",source:"xp-gain-and-hunt-analyzer-gold"};

    if (elapsedMs >= MEASURE_MS) {
      const realXph = Math.round(windowXpGain * 12);
      const realGoldph = Math.round(goldGained * 12);
      const measurements = {...(st.huntMeasurements || {})};
      const old = measurements[hunt] || {sessions:[]};
      const estimateRow=st.lastAnalysis?.ranked?.find(r=>norm(r.name)===norm(hunt));
      const baseEstimatedXph=Number(estimateRow?.estimatedXph||old.baseEstimatedXph||0);
      const estimatedGoldph=Number(estimateRow?.estimatedGoldph||old.estimatedGoldph||0);
      const previousCount=Number(old.totalSessions||old.sessions?.length||0);
      const totalSessions=previousCount+1;
      const totalXpGain=Number(old.totalXpGainForCalibration ?? (old.sessions||[]).reduce((a,v)=>a+Number(v.xpGained||0),0))+windowXpGain;
      const totalRealXph=Number(old.totalRealXph ?? (old.sessions||[]).reduce((a,v)=>a+Number(v.realXph||0),0))+realXph;
      const totalRealGoldph=Number(old.totalRealGoldph ?? (old.sessions||[]).reduce((a,v)=>a+Number(v.realGoldph||0),0))+realGoldph;
      const totalGoldGain=Number(old.totalGoldGain ?? (old.sessions||[]).reduce((a,v)=>a+Number(v.goldGained||0),0))+goldGained;
      const realAverage5m=Math.round(totalXpGain/totalSessions);
      const currentExpected5m=Number(old.calibratedExpected5m || (baseEstimatedXph/12) || windowXpGain);
      // Convergencia gradual: avanza solo 20% de la diferencia en cada ventana completa.
      const calibratedExpected5m=Math.round(currentExpected5m+(realAverage5m-currentExpected5m)*0.20);
      const calibratedExpectedXph=Math.round(calibratedExpected5m*12);
      const avgXph=Math.round(totalRealXph/totalSessions);
      const avgGoldph=Math.round(totalRealGoldph/totalSessions);
      const avgXpGained=realAverage5m;
      const avgGoldGained=Math.round(totalGoldGain/totalSessions);
      const realAverageGold5m=Math.round(totalGoldGain/totalSessions);
      const currentExpectedGold5m=Number(old.calibratedExpectedGold5m || ((old.calibratedExpectedGoldph||estimatedGoldph)/12) || goldGained);
      const calibratedExpectedGold5m=Math.round(currentExpectedGold5m+(realAverageGold5m-currentExpectedGold5m)*0.20);
      const calibratedExpectedGoldph=Math.round(calibratedExpectedGold5m*12);
      const differencePct=calibratedExpectedXph?((realXph-calibratedExpectedXph)/calibratedExpectedXph)*100:null;
      const goldDifferencePct=calibratedExpectedGoldph?((realGoldph-calibratedExpectedGoldph)/calibratedExpectedGoldph)*100:null;
      const calibrationErrorPct=calibratedExpected5m?Math.abs((windowXpGain-calibratedExpected5m)/calibratedExpected5m)*100:null;
      const image=estimateRow?.image||old.image||"";
      const session = {at:now,durationMs:MEASURE_MS,xpGained:Math.round(windowXpGain),goldGained:Math.round(goldGained),suppliesSpent:Math.round(suppliesSpent),profitGained:Math.round(profitGained),xpStack:Math.round(totals.xpStack),realXph,realGoldph,estimatedXph:calibratedExpectedXph,baseEstimatedXph,estimatedGoldph:calibratedExpectedGoldph,baseEstimatedGoldph:estimatedGoldph,differencePct,goldDifferencePct,calibrationErrorPct,image,source:"xp-gain-5m-calibration-20pct"};
      const sessions = [...(old.sessions || []), session].slice(-30);
      const calibratedDifferencePct=baseEstimatedXph?((calibratedExpectedXph-baseEstimatedXph)/baseEstimatedXph)*100:null;
      const calibratedGoldDifferencePct=estimatedGoldph?((calibratedExpectedGoldph-estimatedGoldph)/estimatedGoldph)*100:null;
      measurements[hunt] = {sessions,totalSessions,totalXpGainForCalibration:totalXpGain,totalRealXph,totalRealGoldph,totalGoldGain,
        avgXph,avgGoldph,avgXpGained,avgGoldGained,lastXph:realXph,lastGoldph:realGoldph,
        lastXpGained:Math.round(windowXpGain),lastGoldGained:Math.round(goldGained),
        calibratedExpected5m,calibratedExpectedXph,calibratedExpectedGold5m,calibratedExpectedGoldph,estimatedXph:calibratedExpectedXph,baseEstimatedXph,estimatedGoldph:calibratedExpectedGoldph,baseEstimatedGoldph:estimatedGoldph,
        differencePct,goldDifferencePct,calibratedDifferencePct,calibratedGoldDifferencePct,calibrationErrorPct,
        image,updatedAt:now,source:"xp-gain-5m-calibration-20pct"};

      // Comienza inmediatamente la siguiente ventana sin reiniciar el acumulado de sesión.
      state = {...state,status:"running",windowStartAt:now,elapsedMs:0,xpGained:0,windowXpGain:0,
        goldGained:0,suppliesSpent:0,profitGained:0,
        sessionGoldGained:Number(state.sessionGoldGained||0)+goldGained,
        sessionSuppliesSpent:Number(state.sessionSuppliesSpent||0)+suppliesSpent,
        sessionProfitGained:Number(state.sessionProfitGained||0)+profitGained,
        windowStartLoot:totals.loot,windowStartSupplies:totals.supplies,windowStartBalance:totals.balance,
        realXph,realGoldph,lastCompletedAt:now,differencePct,goldDifferencePct,calibrationErrorPct,updatedAt:now};
      await chrome.storage.local.set({huntMeasurements:measurements,measurementState:state});
      // Recalcula ranking, mejor progresión y mejor gold con la calibración nueva.
      try { await analyze(); } catch (_) {}
      await addLog(`Ventana de 5m en ${hunt}: ${realXph.toLocaleString()} XP/h. Esperada calibrada: ${calibratedExpectedXph.toLocaleString()} XP/h.`);
      return;
    }
    await chrome.storage.local.set({measurementState:state});
  }

  function resetMeasurementTimer(){
    if(measurementTimer) clearInterval(measurementTimer);
    measurementTimer=setInterval(()=>measurementTick().catch(()=>{}),1000);
    measurementTick().catch(()=>{});
  }

  async function resetTimer(){
    if(timer) clearInterval(timer);
    const st=await chrome.storage.local.get(DEFAULTS);
    timer=setInterval(staminaTick,Math.max(3,Number(st.intervalSeconds)||10)*1000);
    staminaTick();
  }


  function bossModalVisible(){
    const m=document.querySelector('#boss-modal');
    if(!m)return false;
    const cs=getComputedStyle(m);
    return !m.classList.contains('hidden')&&cs.display!=='none'&&cs.visibility!=='hidden';
  }
  const bossNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  let ownBossRun={state:'idle',index:0,total:0,current:'',queue:[],stop:false,pause:false,message:'',startedAt:0};
  let bossCache={bosses:[],charges:'',updatedAt:0};
  let bossRefreshPromise=null;

  function canvasHasPixels(canvas){
    try{
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)return true;
      const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=3;i<d.length;i+=4)if(d[i]>0)return true;
    }catch(_){return true;}
    return false;
  }
  function bossImageData(el){
    try{
      const canvas=el?.querySelector('canvas.boss-cell-mon,canvas');
      if(canvas&&canvas.width&&canvas.height&&canvasHasPixels(canvas)){
        const url=canvas.toDataURL('image/png');
        if(url&&url.length>150)return url;
      }
      const img=el?.querySelector('img.boss-cell-mon,img');
      const src=img?.currentSrc||img?.src||img?.getAttribute('src')||'';
      if(src)return src;
      const bg=img?getComputedStyle(img).backgroundImage:'';
      const match=bg&&bg.match(/^url\(["']?(.*?)["']?\)$/);
      if(match?.[1])return match[1];
    }catch(_){ }
    return '';
  }
  function bossSlug(name){return bossNorm(name).replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
  function bossCellData(el){
    const rawTitle=(el?.getAttribute('title')||el?.dataset?.name||'').trim();
    const title=rawTitle.replace(/\s*[·•|].*$/,'').trim()||el?.querySelector('b,strong,.boss-cell-name')?.textContent?.trim()||'Boss';
    const status=el?.querySelector('.boss-cell-status')?.textContent?.trim()||'';
    const category=['bane','archfoe','nemesis'].find(c=>el?.classList.contains(c))||'boss';
    const titleState=[rawTitle,status,el?.className||''].join(' ');
    const levelWarning=/level|nivel/i.test(titleState);
    const cooldown=/cooldown|\bcd\b|reset|already|done|killed today|defeated today|ja feito|já feito|realizado/i.test(titleState)||el?.classList.contains('locked')&&/\d+[hms]/i.test(status);
    const completed=cooldown||/completed|conclu|derrotad|finaliz/i.test(titleState);
    const disabled=!!el&&(el.classList.contains('disabled')||el.getAttribute('aria-disabled')==='true');
    return{id:el?.dataset?.id||bossSlug(title),name:title,category,status:status||(cooldown?'Cooldown':''),ready:!disabled&&!completed,levelWarning,completed,cooldown,image:bossImageData(el)};
  }
  function readBossSnapshot(){
    const body=document.querySelector('#boss-modal-body');
    const globals=[...(body?.querySelectorAll('.boss-global')||[])].map(x=>x.textContent.replace(/\s+/g,' ').trim());
    const charges=(globals.find(x=>/charges|cargas/i.test(x))||'').replace(/^.*?:\s*/,'');
    const bosses=[...(body?.querySelectorAll('.boss-pane-list .boss-cell, .boss-cell')||[])].map(bossCellData).filter((b,i,a)=>b.name&&a.findIndex(x=>bossNorm(x.name)===bossNorm(b.name))===i);
    if(bosses.length){
      const previous=new Map((bossCache.bosses||[]).map(b=>[bossNorm(b.name),b]));
      const merged=bosses.map(b=>{
        const old=previous.get(bossNorm(b.name))||{};
        return {...old,...b,image:b.image||old.image||''};
      });
      // Preserve cached bosses that are temporarily absent from a virtualized list.
      const seen=new Set(merged.map(b=>bossNorm(b.name)));
      for(const old of bossCache.bosses||[]) if(!seen.has(bossNorm(old.name))) merged.push(old);
      bossCache={bosses:merged,charges:charges||bossCache.charges||'',updatedAt:Date.now()};
      chrome.storage.local.set({bossCatalogCache:bossCache}).catch(()=>{});
    }
    const source=bossCache;
    return{modalOpen:bossModalVisible(),charges:source.charges||'',bosses:source.bosses||[],cacheUpdatedAt:bossCache.updatedAt||0,queue:ownBossRun.queue||[],running:ownBossRun.state==='running',run:{state:ownBossRun.state,index:ownBossRun.index,total:ownBossRun.total,current:ownBossRun.current,message:ownBossRun.message,queue:ownBossRun.queue||[]}};
  }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  function clickOutsideBossPanel(){
    const modal=document.querySelector('#boss-modal');
    const wave=document.querySelector('#wave-title');
    const points=[
      [Math.round(window.innerWidth*.50),Math.round(window.innerHeight*.55)],
      [Math.round(window.innerWidth*.18),Math.round(window.innerHeight*.55)],
      [Math.round(window.innerWidth*.82),Math.round(window.innerHeight*.55)],
      [12,Math.round(window.innerHeight*.50)]
    ];
    let target=null;
    for(const [x,y] of points){
      const el=document.elementFromPoint(x,y);
      if(el && !(modal&&modal.contains(el)) && !(wave&&wave.contains(el))){ target=el; break; }
    }
    target=target||document.querySelector('#game,#game-root,main,.game-container,#app')||document.body;
    const opts={bubbles:true,cancelable:true,view:window,clientX:Math.round(window.innerWidth*.5),clientY:Math.round(window.innerHeight*.55),button:0,buttons:1};
    try{ target.dispatchEvent(new PointerEvent('pointerdown',opts)); }catch(_){}
    target.dispatchEvent(new MouseEvent('mousedown',opts));
    try{ target.dispatchEvent(new PointerEvent('pointerup',{...opts,buttons:0})); }catch(_){}
    target.dispatchEvent(new MouseEvent('mouseup',{...opts,buttons:0}));
    target.dispatchEvent(new MouseEvent('click',{...opts,buttons:0}));
  }

  async function closeBossPanel(){
    for(let i=0;i<6&&bossModalVisible();i++){
      // Este desplegable se cierra como en el juego: haciendo clic fuera del panel.
      clickOutsideBossPanel();
      await wait(220);
      if(!bossModalVisible()) break;
      const modal=document.querySelector('#boss-modal');
      const close=modal?.querySelector('#boss-modal-close,.im-closebtn,[aria-label="Close"],[aria-label="Cerrar"],[data-i18n="Fechar"]');
      close?.click();
      await wait(160);
      if(bossModalVisible()) document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
      await wait(180);
    }
    return !bossModalVisible();
  }
  async function openBossPanel(){
    if(bossModalVisible())return readBossSnapshot();
    document.querySelector('#wave-title')?.click();await wait(250);
    const candidates=[...document.querySelectorAll('button,[role="button"],a')];
    const btn=candidates.find(x=>/^bosses?$/i.test((x.textContent||'').trim())||/bosses/i.test(x.getAttribute('data-tip')||x.getAttribute('title')||''));
    if(btn)btn.click();
    for(let i=0;i<12&&!bossModalVisible();i++)await wait(100);
    await wait(250);
    return readBossSnapshot();
  }
  function installBossScanMask(){
    let style=document.querySelector('#baiak-compass-boss-scan-style');
    if(!style){
      style=document.createElement('style');style.id='baiak-compass-boss-scan-style';
      style.textContent=`body.baiak-compass-boss-scan #boss-modal{position:fixed!important;left:-12000px!important;top:-12000px!important;opacity:0!important;pointer-events:none!important;visibility:visible!important;display:block!important;z-index:-2147483647!important}`;
      document.documentElement.appendChild(style);
    }
    document.body.classList.add('baiak-compass-boss-scan');
  }
  function removeBossScanMask(){document.body.classList.remove('baiak-compass-boss-scan');}
  async function refreshBossCatalogSilently(force=false){
    if(bossRefreshPromise)return bossRefreshPromise;
    const age=Date.now()-(bossCache.updatedAt||0);
    const cachedImages=(bossCache.bosses||[]).filter(b=>b.image).length;
    if(!force&&bossCache.bosses.length&&cachedImages===bossCache.bosses.length&&age<60000)return readBossSnapshot();
    bossRefreshPromise=(async()=>{
      const wasOpen=bossModalVisible();
      const teleportState=rememberTeleportUiState();
      try{
        if(!wasOpen)installBossScanMask();
        await openBossPanel();
        let best=readBossSnapshot();
        for(let i=0;i<30;i++){
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          await wait(120);
          const snap=readBossSnapshot();
          const count=(snap.bosses||[]).filter(b=>b.image).length;
          const bestCount=(best.bosses||[]).filter(b=>b.image).length;
          if(count>=bestCount)best=snap;
          if(snap.bosses.length&&count===snap.bosses.length)break;
        }
        return best;
      }finally{
        // El mask hacía que bossModalVisible() devolviera false y evitaba el cierre.
        // Se retira primero, luego se cierra el modal real y finalmente Teleporting.
        removeBossScanMask();
        if(!wasOpen){
          await closeBossPanel();
          await closeHuntPickerConfirmed();
        }
        await restoreTeleportUiState(teleportState);
        if(!teleportState.menuOpen) await setTeleportMenuOpen(false);
        bossRefreshPromise=null;
      }
    })();
    return bossRefreshPromise;
  }
  function findBossCell(item){
    const cells=[...document.querySelectorAll('#boss-modal-body .boss-cell, #boss-modal .boss-cell')];
    if(item.id){const byId=cells.find(el=>String(el.dataset.id||'')===String(item.id));if(byId)return byId;}
    const n=bossNorm(item.name);
    return cells.find(el=>bossNorm(bossCellData(el).name)===n)||cells.find(el=>bossNorm(bossCellData(el).name).includes(n)||n.includes(bossNorm(bossCellData(el).name)));
  }

  async function selectBossFromCompass(item){
    await openBossPanel();
    for(let i=0;i<12;i++){
      const cell=findBossCell(item);
      if(cell){cell.scrollIntoView({block:'center',inline:'center'});cell.click();return {selected:true,name:bossCellData(cell).name};}
      await wait(200);
    }
    throw Error('No se encontró el boss en el panel del juego.');
  }

  function visibleButtons(){return [...document.querySelectorAll('button,[role="button"],a')].filter(el=>{const r=el.getBoundingClientRect();const st=getComputedStyle(el);return r.width>0&&r.height>0&&st.display!=='none'&&st.visibility!=='hidden'&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'});}
  function findNormalBossAction(){
    const excluded=/auto\s*boss|playlist|add|remove|close|fechar|cerrar|cancel|voltar|back/i;
    const wanted=/fight|battle|enter|start|challenge|attack|lutar|combater|entrar|iniciar|desafiar|atacar|pelear|combatir/i;
    const scoped=[...document.querySelectorAll('#boss-modal button,#boss-modal [role="button"],#boss-modal a')].filter(el=>{const t=(el.textContent||el.getAttribute('title')||el.getAttribute('data-tip')||'').trim();return wanted.test(t)&&!excluded.test(t)&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'});
    return scoped[0]||visibleButtons().find(el=>{const t=(el.textContent||el.getAttribute('title')||el.getAttribute('data-tip')||'').trim();return wanted.test(t)&&!excluded.test(t)});
  }
  async function persistBossRun(){await chrome.storage.local.set({bossOwnQueue:ownBossRun.queue,bossOwnRun:{state:ownBossRun.state,index:ownBossRun.index,total:ownBossRun.total,current:ownBossRun.current,message:ownBossRun.message,startedAt:ownBossRun.startedAt}});}
  async function waitWhilePaused(){while(ownBossRun.pause&&!ownBossRun.stop){ownBossRun.state='paused';await persistBossRun();await wait(300)}if(!ownBossRun.stop)ownBossRun.state='running';}
  async function processOwnBoss(item,position){
    await waitWhilePaused(); if(ownBossRun.stop)return 'stopped';
    await openBossPanel(); await wait(350);
    const cell=findBossCell(item);
    if(!cell)return 'error';
    const before=bossCellData(cell);
    if(before.completed)return before.cooldown?'already_completed':'completed';
    item.status=before.levelWarning?'level_warning':'running'; await persistBossRun();
    cell.scrollIntoView({block:'center'});cell.click();await wait(550);
    let action=findNormalBossAction();
    if(!action){cell.click();await wait(450);action=findNormalBossAction();}
    if(!action){
      const afterCell=findBossCell(item),after=afterCell?bossCellData(afterCell):before;
      if(after.completed)return after.cooldown?'already_completed':'completed';
      return /level|nivel/i.test(after.status)?'rejected':'error';
    }
    action.click();
    const started=Date.now(),timeout=12*60*1000;
    while(Date.now()-started<timeout){
      await waitWhilePaused(); if(ownBossRun.stop)return 'stopped';
      await wait(1000);
      const snapCell=findBossCell(item),d=snapCell?bossCellData(snapCell):null;
      if(d?.completed)return 'completed';
      const pageText=bossNorm(document.body.innerText.slice(-12000));
      if(/you died|voce morreu|você morreu|has muerto|derrota|defeat/.test(pageText))return 'defeat';
      if(/victory|boss defeated|boss killed|vitoria|vitória|derrotado|completado/.test(pageText)){
        await openBossPanel();await wait(500);const verify=findBossCell(item);if(verify&&bossCellData(verify).completed)return 'completed';
      }
      if(!bossModalVisible()&&Date.now()-started>2500){await openBossPanel();await wait(450);const verify=findBossCell(item);if(verify&&bossCellData(verify).completed)return 'completed';}
    }
    return 'error';
  }
  async function runOwnBossQueue(queue){
    if(ownBossRun.state==='running'||ownBossRun.state==='paused')throw Error('El Auto Boss ya está en ejecución.');
    await refreshBossCatalogSilently(true);
    const current=readBossSnapshot().bosses;
    ownBossRun={state:'running',index:0,total:queue.length,current:'',queue:queue.map(x=>{const live=current.find(b=>(x.id&&b.id===x.id)||bossNorm(b.name)===bossNorm(x.name));return {...x,status:live?.completed?'already_completed':'pending'};}),stop:false,pause:false,message:'',startedAt:Date.now()};await persistBossRun();
    try{
      for(let i=0;i<ownBossRun.queue.length;i++){
        if(ownBossRun.stop)break;await waitWhilePaused();if(ownBossRun.stop)break;
        const item=ownBossRun.queue[i];ownBossRun.index=i+1;ownBossRun.current=item.name;
        if(item.status==='already_completed'){await persistBossRun();await wait(250);continue;}
        await openBossPanel();await wait(250);const live=findBossCell(item);if(live&&bossCellData(live).completed){item.status='already_completed';await persistBossRun();await wait(250);continue;}
        item.status='running';await persistBossRun();
        let result='error';try{result=await processOwnBoss(item,i)}catch(e){result='error';ownBossRun.message=e.message}
        if(result==='stopped')break;item.status=result;await persistBossRun();await wait(700);
      }
      ownBossRun.state=ownBossRun.stop?'stopped':'finished';ownBossRun.current='';ownBossRun.message=ownBossRun.stop?'Auto Boss detenido.':'Lista finalizada.';await persistBossRun();
    }catch(e){ownBossRun.state='stopped';ownBossRun.message=e.message;await persistBossRun();}
  }
  chrome.storage.local.get({bossCatalogCache:{bosses:[],charges:'',updatedAt:0},huntLogos:{}}).then(st=>{
    if(st.bossCatalogCache?.bosses)bossCache=st.bossCatalogCache;
    setTimeout(()=>refreshBossCatalogSilently(false).catch(()=>{}),1800);
    // Complete the hunt logo library once, then reuse it permanently from storage.
    if(Object.keys(st.huntLogos||{}).length<(HUNT_DB.hunts||[]).length){
      setTimeout(async()=>{
        const teleportState=rememberTeleportUiState();
        try{ await captureAllVisibleHuntLogos(); }
        catch(_){}
        finally{ await restoreTeleportUiState(teleportState); }
      },3200);
    }
  }).catch(()=>{});
  chrome.runtime.onMessage.addListener((msg,_sender,send)=>{
    (async()=>{
      if(msg.type==="BAIAK_ANALYZE") send({ok:true,result:await analyze()});
      else if(msg.type==="BAIAK_STATUS") { const st=await chrome.storage.local.get(DEFAULTS); send({ok:true,...st,stamina:getStaminaPercent(),hunt:currentHunt(),session:readSession()}); }
      else if(msg.type==="BAIAK_GO_HUNT") { await switchToHunt(msg.name); send({ok:true}); }
      else if(msg.type==="BAIAK_STAMINA_NOW") { await staminaTick(); send({ok:true}); }
      else if(msg.type==="BAIAK_CAPTURE_LOGOS") { const teleportState=rememberTeleportUiState(); try{ const result=await captureAllVisibleHuntLogos(); send({ok:true,...result}); } finally{ await restoreTeleportUiState(teleportState); } }
      else if(msg.type==="BAIAK_BOSS_STATUS") send({ok:true,result:await refreshBossCatalogSilently(!!msg.force)});
      else if(msg.type==="BAIAK_BOSS_OPEN") send({ok:true,result:await openBossPanel()});
      else if(msg.type==="BAIAK_BOSS_SELECT") { selectBossFromCompass(msg.boss||{}).then(result=>send({ok:true,result})).catch(e=>send({ok:false,error:e.message})); return true; }
      else if(msg.type==="BAIAK_BOSS_START_OWN") { const queue=Array.isArray(msg.queue)?msg.queue:[]; if(!queue.length) throw Error('La lista está vacía.'); runOwnBossQueue(queue).catch(()=>{}); send({ok:true,message:`Auto Boss iniciado con ${queue.length} bosses.`}); }
      else if(msg.type==="BAIAK_BOSS_PAUSE") { if(ownBossRun.state!=="running") throw Error('El Auto Boss no está ejecutándose.'); ownBossRun.pause=true; ownBossRun.state='paused'; await persistBossRun(); send({ok:true,message:'Auto Boss pausado.'}); }
      else if(msg.type==="BAIAK_BOSS_RESUME") { if(ownBossRun.state!=="paused") throw Error('El Auto Boss no está pausado.'); ownBossRun.pause=false; ownBossRun.state='running'; await persistBossRun(); send({ok:true,message:'Auto Boss reanudado.'}); }
      else if(msg.type==="BAIAK_BOSS_STOP") { ownBossRun.stop=true; ownBossRun.pause=false; ownBossRun.state='stopped'; await persistBossRun(); send({ok:true,message:'Auto Boss detenido.'}); }
    })().catch(e=>send({ok:false,error:e.message}));
    return true;
  });

  chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&(changes.intervalSeconds||changes.staminaEnabled)) resetTimer();});
  resetTimer();
  resetMeasurementTimer();
  // Carga automática: abre internamente el selector si hace falta y guarda el análisis sin intervención del usuario.
  setTimeout(async()=>{
    try{
      const st=await chrome.storage.local.get(DEFAULTS);
      const stale=!st.lastAnalysis || Date.now()-Number(st.lastAnalysis.at||0)>5*60*1000;
      if(stale) await analyze();
    }catch(e){ await addLog(`Análisis automático pendiente: ${e.message}`); }
  },1800);
})();

}
