// Motor de recomendación de builds — réplica del algoritmo de guia-baiakidle.netlify.app,
// que a su vez usa el mismo formato de código BT1 que exporta el propio juego.
// Los datos de árboles/pesos viven en build-data.js (globalThis.BAIAK_BUILD_DATA).
(() => {
  const DATA = globalThis.BAIAK_BUILD_DATA;

  function sortedNodes(tree) {
    return [...tree.nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  function decodeBuildCode(code) {
    const m = /^BT1-([KPSDM])(F|\d{1,7})-([0-9A-F]*)$/i.exec(String(code || "").trim());
    if (!m) return null;
    const voc = DATA.VOC_BY_LETTER[m[1].toUpperCase()];
    const level = m[2].toUpperCase() === "F" ? null : parseInt(m[2], 10);
    const tree = DATA.TREES[voc];
    if (!tree) return { voc, level, ranks: {}, points: 0, nodes: [], valid: false };
    const nodes = sortedNodes(tree);
    const hex = m[3].toUpperCase();
    const ranks = {}; const alloc = []; let pts = 0;
    nodes.forEach((n, i) => {
      const d = i < hex.length ? parseInt(hex[i], 16) : 0;
      const r = Math.min(Number.isFinite(d) ? d : 0, n.maxRank);
      if (r > 0) {
        ranks[n.id] = r; alloc.push({ node: n, rank: r });
        pts += n.kind === "small" ? n.cost * r * (r + 1) / 2 : n.cost;
      }
    });
    return { voc, level, ranks, points: pts, nodes: alloc, valid: true };
  }

  // Orden de parámetros idéntico al del juego: (voc, level, ranks) — verificado
  // contra la función real de guia-baiakidle.netlify.app (buildCodeFrom.toString()).
  function buildCodeFrom(voc, level, ranks) {
    const tree = DATA.TREES[voc];
    if (!tree) return "";
    const nodes = sortedNodes(tree);
    const hex = nodes.map(n => Math.min(Math.max(0, ranks[n.id] || 0), n.maxRank).toString(16)).join("").replace(/0+$/, "");
    const lvl = level == null ? "F" : String(Math.max(1, Math.floor(level)));
    return `BT1-${DATA.VOC_LETTER[voc] || "K"}${lvl}-${hex.toUpperCase()}`;
  }

  function buildAdj(tree) {
    const adj = new Map();
    for (const n of tree.nodes) adj.set(n.id, []);
    for (const n of tree.nodes) for (const r of (n.requires || [])) {
      adj.get(n.id).push(r);
      if (adj.has(r)) adj.get(r).push(n.id);
    }
    return adj;
  }

  function elemWeight(el, buildElem) {
    if (!buildElem) return 1;
    if (el === buildElem) return 1.3;
    return 0.08;
  }

  function tankWeight(el, tankElem) {
    if (!tankElem || tankElem === "def") return DATA.INC_MIX[el] || 0.08;
    if (el === tankElem) return 1.0;
    return 0.05;
  }

  function tankIsElem(tankElem) { return !!tankElem && tankElem !== "def"; }

  // pctx = {voc, buildElem, tankElem, buildVariant}
  function statValue(goal, key, v, sub, ctx, pctx) {
    const a = DATA.AUTO_SHARE[pctx.voc], sp = 1 - a, elems = DATA.VOC_ELEMS[pctx.voc];
    const danoVal = () => {
      const critMult = 1 + (ctx.critChance / 100) * (0.5 + ctx.critDmg / 100);
      const autoMult = (1 + (ctx.atkPct || 0) / 100) * (1 + (ctx.spdPct || 0) / 100) * critMult;
      const spellMult = (1 + (ctx.spellPct || 0) / 100);
      const tot = a * autoMult + sp * spellMult;
      const shareA = a * autoMult / tot, shareS = sp * spellMult / tot;
      switch (key) {
        case "atkPct": return shareA * v / (1 + (ctx.atkPct || 0) / 100);
        case "spellDmgPct": return shareS * v / (1 + (ctx.spellPct || 0) / 100);
        case "attackSpeedPct": return shareA * v / (1 + (ctx.spdPct || 0) / 100);
        case "elementDmgPct": { let s = 0; for (const [el, x] of Object.entries(sub)) if (elems.includes(el)) s += x * elemWeight(el, pctx.buildElem); return s * 0.9 / (1 + (ctx.elemPct || 0) / 100); }
        case "critChance": return shareA * v * (0.5 + ctx.critDmg / 100) / critMult;
        case "critDmg": return shareA * v * (ctx.critChance / 100) / critMult;
        default: return 0;
      }
    };
    const tankVal = () => {
      const elemF = tankIsElem(pctx.tankElem);
      switch (key) {
        case "hpPct": return v;
        case "armorFlat": return v * 0.5 * (elemF ? 0.35 : 1);
        case "defFlat": return v * 0.35 * (elemF ? 0.55 : 1);
        case "absorbPct": { let s = 0; for (const [el, x] of Object.entries(sub)) s += x * tankWeight(el, pctx.tankElem); return s * 7; }
        case "lifeLeech": return v * 0.5;
        case "hpRegenPct": return v * 0.4;
        default: return 0;
      }
    };
    switch (goal) {
      case "dano": return danoVal();
      case "atkspeed": {
        if (key === "attackSpeedPct") return v * 1.6;
        return danoVal() * 0.4;
      }
      case "xp": {
        if (key === "expPct") return v * 1.5;
        if (key === "lootPct") return 0;
        return danoVal() * 0.75;
      }
      case "cura": {
        const boss = pctx.buildVariant === "boss";
        switch (key) {
          case "spellHealPct": return v * (boss ? 1.55 : 1.0);
          case "mpRegenPct": return v * (boss ? 0.9 : 0.55);
          case "manaPct": return v * (boss ? 0.85 : 0.4);
          case "manaLeech": return v * (boss ? 0.7 : 0.62);
          case "hpRegenPct": return v * (boss ? 0.35 : 0.8);
          case "lifeLeech": return v * (boss ? 0.3 : 0.95);
          case "hpPct": return v * (boss ? 0.55 : 0.62);
          case "absorbPct": return tankVal() * (boss ? 0.42 : 0.32);
          default: return danoVal() * (boss ? 0.08 : 0.24);
        }
      }
      case "tank": {
        const t = tankVal(); if (t) return t;
        return danoVal() * 0.1;
      }
    }
    return 0;
  }

  function nodeRankValue(n, goal, ctx, pctx) {
    let v = 0;
    if (n.per) for (const [k, val] of Object.entries(n.per)) {
      if (typeof val === "number") v += statValue(goal, k, val, null, ctx, pctx);
      else v += statValue(goal, k, 0, val, ctx, pctx);
    }
    if (n.special) {
      let sv = (DATA.SPECIAL_VAL[goal] || {})[n.special.key] || 0;
      if (goal === "cura") {
        if (pctx.buildVariant === "boss" && n.special.key === "gift_of_life") sv *= 1.65;
        if (pctx.buildVariant === "pack" && (n.special.key === "dodge" || n.special.key === "momentum")) sv *= 1.45;
      }
      v += sv;
    }
    return v;
  }

  // pctx = {voc, buildElem, tankElem, buildVariant}
  function planBuild(voc, goal, capPts, strict, pctx) {
    const tree = DATA.TREES[voc]; if (!tree) return null;
    const adj = buildAdj(tree);
    const byId = {}; for (const n of tree.nodes) byId[n.id] = n;
    const rank = {}; const buys = []; let spent = 0;
    const ctx = { critChance: 0, critDmg: 50, atkPct: 0, spdPct: 0, spellPct: 0, elemPct: 0 };
    const nextCost = n => n.kind === "small" ? n.cost * ((rank[n.id] || 0) + 1) : n.cost;
    const unlocked = n => n.tier === 0 || (adj.get(n.id) || []).some(id => (rank[id] || 0) >= 1);

    function cheapestUnlockPath(target) {
      const pathPen = n => (goal === "xp" && n.per && n.per.lootPct && (rank[n.id] || 0) < 1) ? 0.25 : 0;
      const dist = new Map(), prev = new Map(), selfBuy = new Set();
      const pq = [];
      for (const n of tree.nodes) {
        if (n.id === target.id) continue;
        if ((rank[n.id] || 0) >= 1) { dist.set(n.id, 0); pq.push([0, n.id]); }
        else if (n.tier === 0) { const c0 = nextCost(n) + pathPen(n); dist.set(n.id, c0); selfBuy.add(n.id); pq.push([c0, n.id]); }
      }
      while (pq.length) {
        pq.sort((a, b) => a[0] - b[0]);
        const [d, id] = pq.shift();
        if ((dist.get(id) ?? Infinity) < d) continue;
        if (id === target.id) break;
        if ((rank[id] || 0) < 1 && !selfBuy.has(id) && !prev.has(id)) continue;
        for (const nb of adj.get(id) || []) {
          const nn = byId[nb]; if (!nn) continue;
          const stepCost = ((rank[nb] || 0) >= 1 ? 0 : nextCost(nn)) + pathPen(nn);
          const nd = d + stepCost;
          if (nd < (dist.get(nb) ?? Infinity)) { dist.set(nb, nd); prev.set(nb, id); pq.push([nd, nb]); }
        }
      }
      if (!dist.has(target.id)) return null;
      const path = []; let cur = target.id;
      while (cur != null) {
        if ((rank[cur] || 0) < 1) path.unshift(cur);
        if (prev.has(cur)) cur = prev.get(cur);
        else { if ((rank[cur] || 0) < 1 && !selfBuy.has(cur)) return null; break; }
      }
      return { ids: path, cost: path.reduce((a, id) => a + ((rank[id] || 0) >= 1 ? 0 : nextCost(byId[id])), 0) };
    }

    function applyBuy(id, targetId) {
      const n = byId[id]; const c = nextCost(n);
      rank[id] = (rank[id] || 0) + 1; spent += c;
      buys.push({ id, rank: rank[id], cost: c, toll: id !== targetId ? byId[targetId].name : null });
      if (n.per) {
        if (n.per.critChance) ctx.critChance += n.per.critChance;
        if (n.per.critDmg) ctx.critDmg += n.per.critDmg;
        if (typeof n.per.atkPct === "number") ctx.atkPct += n.per.atkPct;
        if (typeof n.per.attackSpeedPct === "number") ctx.spdPct += n.per.attackSpeedPct;
        if (typeof n.per.spellDmgPct === "number") ctx.spellPct += n.per.spellDmgPct;
        if (n.per.elementDmgPct && typeof n.per.elementDmgPct === "object") {
          const elems = DATA.VOC_ELEMS[pctx.voc];
          for (const [el, x] of Object.entries(n.per.elementDmgPct)) if (elems.includes(el) && (!pctx.buildElem || el === pctx.buildElem)) ctx.elemPct += x;
        }
      }
    }

    if (goal === "xp") {
      let gx = 0;
      while (spent < capPts && gx++ < 2000) {
        let tgt = null;
        for (const n of tree.nodes) {
          if (!(n.per && n.per.expPct)) continue;
          const r = rank[n.id] || 0;
          if (r >= n.maxRank) continue;
          if (unlocked(n)) {
            const c = nextCost(n);
            if (strict && c > capPts - spent) continue;
            if (!tgt || c < tgt.cost) tgt = { ids: [n.id], cost: c };
          } else if (r === 0) {
            const p = cheapestUnlockPath(n);
            if (p && p.ids.length) {
              if (strict && p.cost > capPts - spent) continue;
              if (!tgt || p.cost < tgt.cost) tgt = { ids: p.ids, cost: p.cost };
            }
          }
        }
        if (!tgt) break;
        const tId = tgt.ids[tgt.ids.length - 1];
        for (const id of tgt.ids) { applyBuy(id, tId); if (spent >= capPts) break; }
      }
    }

    let guard = 0;
    while (spent < capPts && guard++ < 3000) {
      let best = null;
      for (const n of tree.nodes) {
        const r = rank[n.id] || 0;
        if (r >= n.maxRank) continue;
        if (unlocked(n)) {
          const c = nextCost(n);
          if (strict && c > capPts - spent) continue;
          const v = nodeRankValue(n, goal, ctx, pctx) / c;
          if (!best || v > best.v) best = { v, buysList: [n.id], cost: c };
        } else if (r === 0) {
          const p = cheapestUnlockPath(n);
          if (p && p.ids.length) {
            if (strict && p.cost > capPts - spent) continue;
            let pv = 0; for (const id of p.ids) pv += nodeRankValue(byId[id], goal, ctx, pctx);
            const v = pv / p.cost;
            if (!best || v > best.v) best = { v, buysList: p.ids, cost: p.cost };
          }
        }
      }
      if (!best || best.v <= 0.0005) break;
      const targetId = best.buysList[best.buysList.length - 1];
      for (const id of best.buysList) {
        applyBuy(id, targetId);
        if (spent >= capPts) break;
      }
    }

    return { buys, rank, spent, tree, byId };
  }

  function treeFullCost(tree) {
    return tree.nodes.reduce((a, n) => a + (n.kind === "small" ? n.cost * n.maxRank * (n.maxRank + 1) / 2 : n.cost), 0);
  }

  // "1 punto por nivel" — regla confirmada en la guía original.
  function pointsForLevel(level) { return Math.max(0, Math.floor(Number(level) || 0)); }

  function statLabel(key, value) {
    const [tpl] = DATA.STAT_LBL[key] || [`+{v} ${key}`, 1];
    const n = Math.round(value * 10) / 10;
    return tpl.replace("{v}", String(n));
  }

  function nodeDesc(n, rank) {
    const parts = [];
    if (n.per) for (const [k, v] of Object.entries(n.per)) {
      if (typeof v === "number") parts.push(statLabel(k, v * rank));
      else {
        const els = Object.keys(v);
        const total = Object.values(v)[0] * rank;
        if (k === "absorbPct") parts.push(`+${Math.round(total * 10) / 10}% absorción ${els.length >= 7 ? "(todos)" : els.join("/")}`);
        else if (k === "elementDmgPct") parts.push(`+${Math.round(total * 10) / 10}% daño ${els.join("/")}`);
      }
    }
    if (n.special && n.desc) parts.push(n.desc);
    return parts.join(" · ");
  }

  globalThis.BAIAK_BUILD_ENGINE = {
    DATA,
    decodeBuildCode,
    buildCodeFrom,
    planBuild,
    treeFullCost,
    pointsForLevel,
    statLabel,
    nodeDesc,
    sortedNodes
  };
})();
