const $=id=>document.getElementById(id);
const DEFAULTS={staminaEnabled:false,enterAt:20,returnAt:95,intervalSeconds:10,objective:'xp',returnMode:'recommended',minImprovement:3,lastAnalysis:null,huntMeasurements:{},measurementState:null,huntLogos:{},language:'es'};
let data=null;
let chartSamples=[];
let lastChartHunt='';
if($('versionTag'))$('versionTag').textContent=`v${chrome.runtime.getManifest().version}`;
const I18N={
 es:{tabAdvisor:'Advisor',tabHunts:'Hunts',tabParty:'Party',tabAnalytics:'Analytics',tabAuto:'Stamina',tabSettings:'Ajustes',bestProgression:'MEJOR PROGRESIÓN',bestGold:'MEJOR GOLD',hardChallenge:'HARD MODE',go:'IR →',realMeasurement:'◎ MEDICIÓN REAL',time:'Tiempo',estimatedXpHour:'XP estimada/h',projectedXpHour:'XP obtenida/h',estimatedGoldHour:'Gold estimado/h',projectedGoldHour:'Gold obtenido/h',expectedFive:'XP esperada (5m)',gainedFive:'XP ganada (5m)',average:'Promedio',bestHunts:'Mejores hunts',globalSearch:'BUSCADOR GLOBAL',allHunts:'Todas las hunts',recalculate:'↻ Recalcular',catalog:'CATÁLOGO',fullHuntList:'Lista completa de hunts',detectedCharacters:'Personajes detectados',refresh:'↻ Actualizar',realResults:'RESULTADOS REALES',fiveMinuteHistory:'Mediciones de 5 minutos',enterTraining:'Ir a Training',percentOrLess:'% o menos',leaveTraining:'Salir de Training',percentOrMore:'% o más',afterRecharge:'Después de recargar',recommendedHunt:'Ir a la hunt recomendada',previousHunt:'Volver a la anterior',notifyOnly:'Solo notificar',minimumImprovement:'Mejora mínima',checkEvery:'Revisar cada',seconds:'segundos',saveConfig:'Guardar configuración',checkNow:'Comprobar ahora',settings:'CONFIGURACIÓN',language:'Idioma',interfaceLanguage:'Idioma de la interfaz',languageSavedAuto:'El idioma se guarda automáticamente.',footer:'Las hunts se cargan automáticamente. Las estimaciones base nunca se reemplazan por las mediciones.',noActiveHunt:'Sin hunt activa',waiting:'ESPERANDO',measuring:'MIDIENDO',paused:'PAUSADA',completed:'COMPLETADA',recommendedLevel:'Nivel recomendado',risk:'Riesgo',low:'Bajo',medium:'Medio',high:'Alto',veryHigh:'Muy alto',noData:'Sin datos',noMeasurements:'Aún no hay mediciones terminadas.',noAnalysis:'Sin analizar.',loading:'Cargando automáticamente las hunts...',searchPlaceholder:'Escribe el nombre de una hunt...',filterPlaceholder:'Filtrar hunts...',level:'Nivel',hp:'HP',mana:'Mana',vocation:'Vocación',status:'Estado',active:'Activo',offline:'Sin datos',partyOnline:'personajes detectados',estimatedBase:'Estimación base',obtained:'Obtenida',sessions:'Sesiones',details:'DETALLE DE HUNT',saved:'Configuración guardada.',exitGreater:'El valor de salida debe ser mayor.',analyzing:'Analizando todas las hunts...',ready:'Listo',huntsLoaded:'hunts cargadas automáticamente.',noResults:'Sin resultados',closeEstimate:'Cerca de la estimación'},
 pt:{tabAdvisor:'Advisor',tabHunts:'Hunts',tabParty:'Party',tabAnalytics:'Analytics',tabAuto:'Stamina',tabSettings:'Config.',bestProgression:'MELHOR PROGRESSÃO',bestGold:'MELHOR GOLD',hardChallenge:'HARD MODE',go:'IR →',realMeasurement:'◎ MEDIÇÃO REAL',time:'Tempo',estimatedXpHour:'XP estimada/h',projectedXpHour:'XP obtida/h',estimatedGoldHour:'Gold estimado/h',projectedGoldHour:'Gold obtido/h',expectedFive:'XP esperada (5m)',gainedFive:'XP ganha (5m)',average:'Média',bestHunts:'Melhores hunts',globalSearch:'BUSCA GLOBAL',allHunts:'Todas as hunts',recalculate:'↻ Recalcular',catalog:'CATÁLOGO',fullHuntList:'Lista completa de hunts',detectedCharacters:'Personagens detectados',refresh:'↻ Atualizar',realResults:'RESULTADOS REAIS',fiveMinuteHistory:'Medições de 5 minutos',enterTraining:'Ir ao Training',percentOrLess:'% ou menos',leaveTraining:'Sair do Training',percentOrMore:'% ou mais',afterRecharge:'Depois de recarregar',recommendedHunt:'Ir para a hunt recomendada',previousHunt:'Voltar para a anterior',notifyOnly:'Somente notificar',minimumImprovement:'Melhoria mínima',checkEvery:'Verificar a cada',seconds:'segundos',saveConfig:'Salvar configuração',checkNow:'Verificar agora',settings:'CONFIGURAÇÃO',language:'Idioma',interfaceLanguage:'Idioma da interface',languageSavedAuto:'O idioma é salvo automaticamente.',footer:'As hunts são carregadas automaticamente. As estimativas base nunca são substituídas pelas medições.',noActiveHunt:'Sem hunt ativa',waiting:'AGUARDANDO',measuring:'MEDINDO',paused:'PAUSADA',completed:'CONCLUÍDA',recommendedLevel:'Nível recomendado',risk:'Risco',low:'Baixo',medium:'Médio',high:'Alto',veryHigh:'Muito alto',noData:'Sem dados',noMeasurements:'Ainda não há medições concluídas.',noAnalysis:'Sem análise.',loading:'Carregando automaticamente as hunts...',searchPlaceholder:'Digite o nome de uma hunt...',filterPlaceholder:'Filtrar hunts...',level:'Nível',hp:'HP',mana:'Mana',vocation:'Vocação',status:'Estado',active:'Ativo',offline:'Sem dados',partyOnline:'personagens detectados',estimatedBase:'Estimativa base',obtained:'Obtida',sessions:'Sessões',details:'DETALHE DA HUNT',saved:'Configuração salva.',exitGreater:'O valor de saída deve ser maior.',analyzing:'Analisando todas as hunts...',ready:'Pronto',huntsLoaded:'hunts carregadas automaticamente.',noResults:'Sem resultados',closeEstimate:'Perto da estimativa'},
 en:{tabAdvisor:'Advisor',tabHunts:'Hunts',tabParty:'Party',tabAnalytics:'Analytics',tabAuto:'Stamina',tabSettings:'Settings',bestProgression:'BEST PROGRESSION',bestGold:'BEST GOLD',hardChallenge:'HARD MODE',go:'GO →',realMeasurement:'◎ REAL MEASUREMENT',time:'Time',estimatedXpHour:'Estimated XP/h',projectedXpHour:'Obtained XP/h',estimatedGoldHour:'Estimated gold/h',projectedGoldHour:'Obtained gold/h',expectedFive:'Expected XP (5m)',gainedFive:'Gained XP (5m)',average:'Average',bestHunts:'Best hunts',globalSearch:'GLOBAL SEARCH',allHunts:'All hunts',recalculate:'↻ Recalculate',catalog:'CATALOG',fullHuntList:'Complete hunt list',detectedCharacters:'Detected characters',refresh:'↻ Refresh',realResults:'REAL RESULTS',fiveMinuteHistory:'5-minute measurements',enterTraining:'Enter Training',percentOrLess:'% or less',leaveTraining:'Leave Training',percentOrMore:'% or more',afterRecharge:'After recharging',recommendedHunt:'Go to recommended hunt',previousHunt:'Return to previous hunt',notifyOnly:'Notify only',minimumImprovement:'Minimum improvement',checkEvery:'Check every',seconds:'seconds',saveConfig:'Save configuration',checkNow:'Check now',settings:'SETTINGS',language:'Language',interfaceLanguage:'Interface language',languageSavedAuto:'The language is saved automatically.',footer:'Hunts load automatically. Base estimates are never replaced by measurements.',noActiveHunt:'No active hunt',waiting:'WAITING',measuring:'MEASURING',paused:'PAUSED',completed:'COMPLETED',recommendedLevel:'Recommended level',risk:'Risk',low:'Low',medium:'Medium',high:'High',veryHigh:'Very high',noData:'No data',noMeasurements:'There are no completed measurements yet.',noAnalysis:'Not analyzed.',loading:'Automatically loading hunts...',searchPlaceholder:'Type a hunt name...',filterPlaceholder:'Filter hunts...',level:'Level',hp:'HP',mana:'Mana',vocation:'Vocation',status:'Status',active:'Active',offline:'No data',partyOnline:'characters detected',estimatedBase:'Base estimate',obtained:'Obtained',sessions:'Sessions',details:'HUNT DETAILS',saved:'Configuration saved.',exitGreater:'The exit value must be greater.',analyzing:'Analyzing all hunts...',ready:'Ready',huntsLoaded:'hunts loaded automatically.',noResults:'No results',closeEstimate:'Close to estimate'}
};
const t=k=>I18N[data?.language||'es']?.[k]||I18N.es[k]||k;
const fmt=n=>{n=Number(n||0);if(n>=1e9)return(n/1e9).toFixed(2)+'B';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(0)+'K';return Math.round(n).toLocaleString()};
const fmtFull=n=>Math.round(Number(n||0)).toLocaleString(data?.language==='pt'?'pt-BR':data?.language==='en'?'en-US':'es-PE');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const time=ms=>{let s=Math.floor((ms||0)/1000),m=Math.floor(s/60);s%=60;return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`};
const longTime=ms=>{let total=Math.max(0,Math.floor(Number(ms||0)/1000)),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;if(h)return`${h}h ${String(m).padStart(2,'0')}m`;if(m)return`${m}m ${String(sec).padStart(2,'0')}s`;return`${sec}s`};
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const huntEmoji=n=>{n=norm(n);if(n.includes('vex'))return'🔥';if(n.includes('asura'))return'👹';if(n.includes('soul'))return'💀';if(n.includes('dragon'))return'🐉';if(n.includes('spider'))return'🕷️';if(n.includes('elf'))return'🧝';if(n.includes('troll'))return'👺';if(n.includes('minotaur'))return'🐂';if(n.includes('demon'))return'😈';return'⚔️'};
const cachedHuntImage=name=>data?.huntLogos?.[norm(name)]||'';
const withHuntImage=(primary,fallback)=>{const name=primary?.name||primary?.hunt||fallback?.name||fallback?.hunt||'';return {...(fallback||{}),...(primary||{}),image:primary?.image||fallback?.image||cachedHuntImage(name)||''};};
const logo=(r,cls='mini-logo')=>{const row=withHuntImage(r);return row?.image?`<img class="${cls}" src="${esc(row.image)}" alt="${esc(row.name||row.hunt||'hunt')}">`:`<span class="${cls} logo-fallback">${huntEmoji(row?.name||row?.hunt)}</span>`;};
const diffText=v=>v==null||!Number.isFinite(Number(v))?'—':`${Number(v)>=0?'+':''}${Number(v).toFixed(1)}%`;
const diffClass=v=>v==null?'':Number(v)>1?'positive':Number(v)<-1?'negative':'neutral';
async function message(payload){
  // El popup ahora vive en su propia ventana (background.js), así que "currentWindow" ya
  // no es la ventana del juego: hay que ubicar la pestaña de Baiak Idle por su URL.
  const tabs=await chrome.tabs.query({url:'https://baiakidle.com/*'});
  const tab=tabs.find(t=>t.active)||tabs[0];
  if(!tab?.id)throw Error('Abre Baiak Idle.');
  return chrome.tabs.sendMessage(tab.id,payload)
}
function measurementFor(name){return data?.huntMeasurements?.[name]||null}
function recommendationMetric(row,type='xp'){
  const m=measurementFor(row?.name);
  const hasReal=Number(m?.totalSessions||m?.sessions?.length||0)>0;
  const real=type==='gold'?Number(m?.avgGoldph):Number(m?.avgXph);
  const estimated=type==='gold'?Number(row?.estimatedGoldph||row?.goldph||0):Number(row?.estimatedXph||row?.xph||0);
  return {value:hasReal&&Number.isFinite(real)?real:estimated,source:hasReal?'real':'estimated',measurement:m};
}
function sourceLabel(source){
  if(data?.language==='pt')return source==='real'?'REAL':'ESTIMADA';
  if(data?.language==='en')return source==='real'?'REAL':'ESTIMATED';
  return source==='real'?'REAL':'ESTIMADA';
}
function objectiveRows(rows,obj){
  const r=[...(rows||[])];
  if(obj==='gold')return r.sort((a,b)=>recommendationMetric(b,'gold').value-recommendationMetric(a,'gold').value);
  if(obj==='balance'){
    const mx=Math.max(...r.map(x=>recommendationMetric(x,'xp').value),1),mg=Math.max(...r.map(x=>recommendationMetric(x,'gold').value),1);
    return r.sort((a,b)=>((recommendationMetric(b,'xp').value/mx)+(recommendationMetric(b,'gold').value/mg)-(Number(b.risk||0)/250))-((recommendationMetric(a,'xp').value/mx)+(recommendationMetric(a,'gold').value/mg)-(Number(a.risk||0)/250)));
  }
  return r.sort((a,b)=>recommendationMetric(b,'xp').value-recommendationMetric(a,'xp').value);
}
async function go(name){if(!name)return;try{await message({type:'BAIAK_GO_HUNT',name});window.close()}catch(e){$('analysisMsg').textContent=e.message}}
function riskLabel(v){v=Number(v||0);if(v>=75)return t('veryHigh');if(v>=50)return t('high');if(v>=25)return t('medium');return t('low')}
function applyLanguage(){const lang=data?.language||'es';document.documentElement.lang=lang;document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));document.querySelectorAll('#language [data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));const code={es:'ES',pt:'PT',en:'EN'}[lang]||'ES';if($('currentLanguageCode'))$('currentLanguageCode').textContent=code;if($('currentFlag'))$('currentFlag').className=`flag flag-${lang==='pt'?'br':lang==='en'?'us':'es'}`;if($('settingsLanguage'))$('settingsLanguage').value=lang;$('search').placeholder=t('searchPlaceholder');$('huntFilter').placeholder=t('filterPlaceholder')}
function setHeroLogo(id,row){const el=$(id);if(!el)return;row=withHuntImage(row);if(row?.image){el.innerHTML=`<img src="${esc(row.image)}" alt="${esc(row.name||'hunt')}">`;el.classList.add('has-image')}else{el.textContent=huntEmoji(row?.name);el.classList.remove('has-image')}}
function setSourceBadge(id,source,visible=true){const el=$(id);if(!el)return;el.textContent=sourceLabel(source).toLowerCase().replace(/^./,c=>c.toUpperCase());el.className=`metric-source ${source==='real'?'real':'estimated'}`;el.hidden=!visible;}
function renderAdvisor(){
  if(!data?.lastAnalysis)return;
  const rows=data.lastAnalysis.ranked||[];
  const progression=objectiveRows(rows,'xp')[0];
  const gold=objectiveRows(rows,'gold')[0];
  const hardPool=rows.filter(r=>Number(r.risk||0)>=50);
  const hard=(hardPool.length?objectiveRows(hardPool,'xp'):[...rows].sort((a,b)=>(b.risk||0)-(a.risk||0)))[0];
  const xpMetric=recommendationMetric(progression,'xp'),goldMetric=recommendationMetric(gold,'gold'),hardMetric=recommendationMetric(hard,'xp');
  $('bestXpName').textContent=progression?.name||'—';
  $('bestXpValue').textContent=progression?`${fmt(xpMetric.value)} XP/h`:'—';
  setSourceBadge('bestXpSource',xpMetric.source,!!progression);
  $('bestXpLevel').textContent=progression?`${t('recommendedLevel')} ${progression.level}+`:'—';
  $('bestGoldName').textContent=gold?.name||'—';
  $('bestGoldValue').textContent=gold?`${fmt(goldMetric.value)} gold/h`:'—';
  setSourceBadge('bestGoldSource',goldMetric.source,!!gold);
  $('bestGoldLevel').textContent=gold?`${t('recommendedLevel')} ${gold.level}+`:'—';
  $('hardName').textContent=hard?.name||'—';
  $('hardXp').textContent=hard?`${fmt(hardMetric.value)} XP/h`:'—';
  setSourceBadge('hardSource',hardMetric.source,!!hard);
  $('hardRisk').textContent=hard?`${t('risk')}: ${riskLabel(hard.risk)}`:'—';
  $('hardLevel').textContent=hard?`${t('recommendedLevel')} ${hard.level}+`:'—';
  setHeroLogo('bestXpIcon',progression);setHeroLogo('bestGoldIcon',gold);setHeroLogo('hardIcon',hard);
  $('goBestXp').onclick=()=>go(progression?.name);$('goBestGold').onclick=()=>go(gold?.name);$('goHard').onclick=()=>go(hard?.name);
  renderTop();renderAllHunts();renderParty();renderHistory();
}
function renderTop(){
  const objective=data?.objective||'xp';
  const rows=objectiveRows(data?.lastAnalysis?.ranked||[],objective).slice(0,5);
  $('topFive').classList.toggle('empty',!rows.length);
  $('topFive').innerHTML=rows.map((r,i)=>{
    const xp=recommendationMetric(r,'xp'),gold=recommendationMetric(r,'gold');
    const source=objective==='gold'?gold.source:xp.source;
    let main='',secondary='';
    if(objective==='gold'){main=`${fmt(gold.value)} gold/h`;secondary=`${fmt(xp.value)} XP/h`;}
    else if(objective==='balance'){main=`${fmt(xp.value)} XP/h`;secondary=`${fmt(gold.value)} gold/h`;}
    else{main=`${fmt(xp.value)} XP/h`;secondary=`${fmt(gold.value)} gold/h`;}
    return`<div class="rank-row rank-${objective}">${logo(r)}<span class="rank-num">${i+1}</span><div class="rank-name"><b>${esc(r.name)}</b><small>${t('level')} ${r.level} · ${secondary}</small></div><span class="rank-value"><b>${main}</b><em class="rank-source ${source==='real'?'real':'estimated'}">${sourceLabel(source).toLowerCase().replace(/^./,c=>c.toUpperCase())}</em></span><button class="go" data-go="${encodeURIComponent(r.name)}">${t('go')}</button></div>`
  }).join('')||t('loading');
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(decodeURIComponent(b.dataset.go)));
}

function renderXpChart(projected,estimated,hunt){
  const box=$('xpChart'); if(!box)return;
  if(hunt!==lastChartHunt){chartSamples=[];lastChartHunt=hunt||'';}
  const now=Date.now();
  if(projected>0){const prev=chartSamples.at(-1);if(!prev||now-prev.t>=2500)chartSamples.push({t:now,v:projected});}
  chartSamples=chartSamples.filter(x=>now-x.t<=3600000).slice(-60);
  $('chartNow').textContent=projected?fmt(projected)+' XP/h':'—';
  if(chartSamples.length<2){box.innerHTML='<div class="chart-empty">Esperando datos de XP…</div>';return;}
  const vals=chartSamples.map(x=>x.v).concat(estimated?[estimated]:[]), max=Math.max(...vals,1), min=Math.min(...vals,0), span=Math.max(1,max-min);
  const w=520,h=150,pad=18; const pts=chartSamples.map((x,i)=>{const px=pad+i*(w-pad*2)/Math.max(1,chartSamples.length-1);const py=h-pad-(x.v-min)/span*(h-pad*2);return `${px.toFixed(1)},${py.toFixed(1)}`}).join(' ');
  const ey=estimated?h-pad-(estimated-min)/span*(h-pad*2):null;
  box.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="XP por hora en tiempo real"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55adff" stop-opacity=".3"/><stop offset="1" stop-color="#55adff" stop-opacity="0"/></linearGradient></defs><path d="M ${pts.split(' ').join(' L ')} L ${w-pad},${h-pad} L ${pad},${h-pad} Z" fill="url(#area)"/><polyline points="${pts}" fill="none" stroke="#59b1ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${ey!==null?`<line x1="${pad}" y1="${ey}" x2="${w-pad}" y2="${ey}" stroke="#f0c456" stroke-width="1.5" stroke-dasharray="6 5"/>`:''}</svg>`;
}
function updateMeasurementClock(){
  const s=data?.measurementState;
  const clock=$('measureTime'),bar=$('measureBar');
  if(!clock||!bar)return;
  const WINDOW_MS=5*60*1000;
  const storedElapsed=Number(s?.elapsedMs||0);
  const wallElapsed=s?.status==='running'&&s?.windowStartAt?Math.max(0,Date.now()-Number(s.windowStartAt)):storedElapsed;
  const elapsed=Math.min(WINDOW_MS,Math.max(storedElapsed,wallElapsed));
  bar.style.width=`${Math.min(100,elapsed/WINDOW_MS*100)}%`;
  clock.textContent=`${time(elapsed)} / 05:00`;
}
function renderMeasurement(){
  const s=data?.measurementState,row=(data?.lastAnalysis?.ranked||[]).find(r=>norm(r.name)===norm(s?.hunt)),m=measurementFor(s?.hunt);
  $('measureHunt').textContent=s?.hunt||t('noActiveHunt');const img=s?.image||row?.image||m?.image||cachedHuntImage(s?.hunt||row?.name||m?.hunt)||'';const im=$('measureLogo');im.src=img;im.classList.toggle('hidden',!img);
  // Reloj visual independiente del análisis pesado del juego.
  updateMeasurementClock();
  const storedElapsed=Number(s?.elapsedMs||0);
  const elapsed=s?.status==='running'&&s?.windowStartAt?Math.max(storedElapsed,Date.now()-Number(s.windowStartAt)):storedElapsed;
  const baseEst=Number(row?.estimatedXph||m?.baseEstimatedXph||0);
  const est=Number(m?.calibratedExpectedXph||baseEst||0),expected=Number(m?.calibratedExpected5m||est/12||0);
  const estGold=Number(m?.calibratedExpectedGoldph||row?.goldph||row?.estimatedGoldph||m?.estimatedGoldph||0);
  const xpGain5=Number(s?.windowXpGain??s?.xpGained??0),xpGainTotal=Number(s?.cumulativeXpGain||0);
  const lastRealXph=Number(m?.lastXph||s?.realXph||0),lastRealGoldph=Number(m?.lastGoldph||s?.realGoldph||0);
  const gold5=Number(s?.goldGained||0),supplies5=Number(s?.suppliesSpent||0),profit5=Number(s?.profitGained||0);
  const liveDiff=est&&lastRealXph?((lastRealXph-est)/est)*100:null;
  const goldDiff=estGold&&lastRealGoldph?((lastRealGoldph-estGold)/estGold)*100:null;
  $('measureEstimate').textContent=est?fmt(est)+' XP/h':'—';
  $('measureProjection').textContent=lastRealXph?fmt(lastRealXph)+' XP/h':'—';
  $('measureDiff').textContent=diffText(liveDiff);$('measureDiff').className=`difference ${diffClass(liveDiff)}`;
  $('measureGoldEstimate').textContent=estGold?fmt(estGold)+' gold/h':'—';
  $('measureGoldProjection').textContent=lastRealGoldph?fmt(lastRealGoldph)+' gold/h':'—';
  $('measureGoldDiff').textContent=diffText(goldDiff);$('measureGoldDiff').className=`difference ${diffClass(goldDiff)}`;
  $('measureExpected').textContent=expected?fmt(expected)+' XP':'—';
  $('measureXp').textContent=s?fmt(xpGain5)+' XP':'—';
  $('measureStack').textContent=s?fmtFull(s.rawXpStack??s.currentXpStack??0)+' XP':'—';
  $('measureGainTotal').textContent=s?fmtFull(xpGainTotal)+' XP':'—';
  const huntElapsed=s?.startAt?Math.max(0,Date.now()-Number(s.startAt)):0;
  if($('measureGainTime'))$('measureGainTime').textContent=s?`◷ ${longTime(huntElapsed)}`:'◷ 00m';
  $('measureGold').textContent=s?fmtFull(gold5)+' gold':'—';
  $('measureSupplies').textContent=s?fmtFull(supplies5)+' gold':'—';
  $('measureProfit').textContent=s?`${fmtFull(profit5)} gold`:'—';
  $('measureProfit').className=profit5>0?'profit-positive':profit5<0?'profit-negative':'profit-zero';
  $('measureLast').textContent=m?`${fmt(m.avgXph)} XP/h · ${fmt(m.avgGoldph)} gold/h · ${m.totalSessions||m.sessions?.length||0} ${t('sessions').toLowerCase()}`:'—';
  $('currentHuntTop').textContent=s?.hunt||t('noActiveHunt');
  const liveChartXph=elapsed>0?Math.round(xpGain5*3600000/elapsed):lastRealXph;
  renderXpChart(liveChartXph,est,s?.hunt||'');
  $('measureState').textContent=s?.status==='running'?t('measuring'):s?.status==='paused'?t('paused'):t('waiting')
}
function renderSuggestions(){const q=norm($('search').value),box=$('suggestions');if(!q){box.classList.remove('show');box.innerHTML='';return}const rows=(data?.lastAnalysis?.ranked||[]).filter(r=>norm(r.name).includes(q)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,12);box.innerHTML=rows.map(r=>`<div class="suggestion" data-name="${encodeURIComponent(r.name)}"><b>${esc(r.name)}</b><small> · ${fmt(r.xph||r.estimatedXph)} XP/h · ${fmt(r.goldph||r.estimatedGoldph)} gold/h</small></div>`).join('')||`<div class="suggestion">${t('noResults')}</div>`;box.classList.add('show');box.querySelectorAll('[data-name]').forEach(x=>x.onclick=()=>showPreview(decodeURIComponent(x.dataset.name)))}
function showPreview(name){const r=(data?.lastAnalysis?.ranked||[]).find(x=>x.name===name),m=measurementFor(name);if(!r)return;$('search').value=name;$('suggestions').classList.remove('show');const d=m?.calibratedDifferencePct;$('huntPreview').innerHTML=`<div class="preview"><div class="preview-head"><div class="title-with-logo">${logo(withHuntImage(m,r),'hunt-logo')}<div><small>${t('details')}</small><h3>${esc(r.name)}</h3></div></div><button class="go" id="previewGo">${t('go')}</button></div><div class="preview-grid"><div><span>${t('estimatedBase')} XP/h</span><b>${fmt(m?.calibratedExpectedXph||r.estimatedXph)}/h</b></div><div><span>${t('estimatedBase')} Gold/h</span><b>${fmt(r.estimatedGoldph)}/h</b></div><div><span>${t('obtained')} XP/h</span><b>${m?fmt(m.avgXph)+'/h':t('noData')}</b><small class="difference ${diffClass(d)}">${diffText(d)}</small></div><div><span>${t('expectedFive')}</span><b>${fmt(m?.calibratedExpected5m||(r.estimatedXph/12))}</b></div><div><span>${t('gainedFive')}</span><b>${m?fmt(m.avgXpGained||m.lastXpGained):t('noData')}</b></div><div><span>${t('sessions')}</span><b>${m?.sessions?.length||0}</b></div></div></div>`;$('previewGo').onclick=()=>go(name)}
function maxPartyLevel(){return Math.max(0,...((data?.lastAnalysis?.party||[]).map(c=>Number(c.level)||0)))}
function renderAllHunts(){
 const q=norm($('huntFilter')?.value),maxLvl=maxPartyLevel();
 const rows=(data?.lastAnalysis?.ranked||[]).filter(r=>!q||norm(r.name).includes(q)).sort((a,b)=>{
   const aOk=!maxLvl||Number(a.level||0)<=maxLvl,bOk=!maxLvl||Number(b.level||0)<=maxLvl;
   if(aOk!==bOk)return aOk?-1:1;
   return recommendationMetric(b,'xp').value-recommendationMetric(a,'xp').value;
 });
 $('huntCount').textContent=rows.length;$('allHunts').classList.toggle('empty',!rows.length);
 $('allHunts').innerHTML=rows.map(r=>{
   const m=measurementFor(r.name),d=m?.calibratedDifferencePct,xp=recommendationMetric(r,'xp');
   const locked=maxLvl&&Number(r.level||0)>maxLvl;
   return`<div class="hunt-row${locked?' locked':''}">${logo(withHuntImage(m,r))}<div><b>${esc(r.name)}</b><small>${locked?'🔒 ':''}${t('level')} ${r.level} · ${r.lean==='loot'?'Loot':'XP'}${m?` · <span class="difference inline ${diffClass(d)}">${diffText(d)}</span>`:''}</small></div><span>${fmt(xp.value)} XP/h</span><span>${fmt(r.estimatedGoldph)} G/h</span><button class="go" data-go="${encodeURIComponent(r.name)}">${t('go')}</button></div>`;
 }).join('')||t('noData');
 document.querySelectorAll('#allHunts [data-go]').forEach(b=>b.onclick=()=>go(decodeURIComponent(b.dataset.go)))
}
function vocationIcon(v){v=norm(v);if(v.includes('knight'))return'🛡️';if(v.includes('druid'))return'🌿';if(v.includes('sorcerer'))return'🔮';if(v.includes('paladin'))return'🏹';if(v.includes('monk'))return'🥋';return'👤'}
function vocationRole(v){v=norm(v);if(v.includes('knight'))return'TANQUE / FRONTLINE';if(v.includes('paladin'))return'DAÑO A DISTANCIA / SOPORTE';if(v.includes('sorcerer'))return'DAÑO MÁGICO';if(v.includes('druid'))return'SANADOR / SOPORTE';if(v.includes('monk'))return'CUERPO A CUERPO';return'MIEMBRO DE PARTY'}
function statLabel(k){
 const labels={level:'Nivel',xp:'XP',xpPercent:'XP %',xpToNext:'XP faltante',hp:'HP',mana:'Mana',capacity:'Capacidad',tactics:'Tácticas',magic:'Magic Level',magicLevel:'Magic Level','magic level':'Magic Level',melee:'Melee',distance:'Distance',fist:'Fist',shielding:'Shielding',club:'Club',sword:'Sword',axe:'Axe'};
 return labels[k]||String(k).replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
}
function partyStatIcon(type){
 const icons={
  level:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 8.8l6.5-.9L12 2Z"/></svg>',
  hp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z"/></svg>',
  mana:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2S5.5 10.1 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2 12 2Z"/></svg>',
  melee:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 4.3 5-2-2 5-9.4 9.4-2-2 8.4-10.4Z"/><path d="m5.6 14.4 4 4-2.2 2.2-4-4 2.2-2.2Zm3.7-10.1-5-2 2 5 4.2 4.2 2-2-3.2-5.2Zm5.4 10.1-4 4 2.2 2.2 4-4-2.2-2.2Z"/></svg>',
  distance:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3c7 3 7 15 0 18M6 3c4 4 4 14 0 18M6 12h14m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  magic:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.5 3 5.5 5.5-3 3-1.5-1.5L9 17.5l1.5 1.5-3 3L2 16.5l3-3L6.5 15l7.5-7.5L12.5 6l3-3Z"/><path d="M18.5 2v3M22 5.5h-3M20.8 10.2l1.7 1.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  tactics:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
 };
 return `<i class="party-stat-icon ${type}">${icons[type]||''}</i>`;
}
function partyStatValue(value){
 if(value===undefined||value===null||value==='')return null;
 if(typeof value==='object'){
  for(const key of ['total','value','base','level','current']){
   const candidate=value?.[key];
   if(candidate!==undefined&&candidate!==null&&candidate!=='')return candidate;
  }
  return null;
 }
 return value;
}
function compactStat(label,value,type='level',extra=''){
 value=partyStatValue(value);
 if(value===undefined||value===null||value==='')return'';
 const shown=typeof value==='number'?fmtFull(value):String(value);
 return `<span class="party-stat ${esc(type)}" title="${esc(label)}">${partyStatIcon(type)}<span class="party-stat-copy"><small>${esc(label)}</small><b>${esc(shown)}${extra}</b></span></span>`;
}
function preferredPartySkill(c){
 const skills=c?.skills||{},v=norm(c?.vocationKey||c?.vocation);
 const normalized={};
 Object.entries(skills).forEach(([k,val])=>normalized[norm(k)]=val);
 const aliases={
  magic:['magic','magic level','magiclevel','ml','mlvl'],
  distance:['distance','distance fighting','distancia'],
  sword:['sword','sword fighting'],axe:['axe','axe fighting'],club:['club','club fighting'],
  melee:['melee'],shielding:['shielding'],fist:['fist','fist fighting']
 };
 const get=(key)=>{
  for(const alias of aliases[key]||[key]){
   const val=normalized[norm(alias)]??c?.[alias]??c?.[key];
   const resolved=partyStatValue(val);
   if(resolved!==null&&resolved!==undefined&&resolved!=='')return resolved;
  }
  return null;
 };
 const pick=(keys,type)=>{for(const key of keys){const value=get(key);if(value!==null)return {label:statLabel(key),value,type};}return null;};
 if(v.includes('sorcerer')||v.includes('druid')||v.includes('mage'))return pick(['magic'],'magic');
 if(v.includes('paladin')||v.includes('hunter')||v.includes('archer'))return pick(['distance','magic'],'distance');
 if(v.includes('knight'))return pick(['sword','axe','club','melee','shielding'],'melee');
 if(v.includes('monk'))return pick(['fist','melee'],'melee');
 return pick(['magic'],'magic')||pick(['distance'],'distance')||pick(['sword','axe','club','melee','fist'],'melee');
}
function renderParty(){
 const rows=data?.lastAnalysis?.party||[];
 $('partySummary').innerHTML=rows.length?`<span class="status-dot active"></span><b>${rows.length}</b> miembros detectados en la party`:'';
 $('partyCards').classList.toggle('empty',!rows.length);
 $('partyCards').innerHTML=rows.map((c,i)=>{
   const main=preferredPartySkill(c);
   const important=[
     compactStat('Nivel',c.level,'level'),
     compactStat('HP',c.hp,'hp'),
     compactStat('Mana',c.mana,'mana'),
     main?compactStat(main.label,main.value,main.type):'',
     compactStat('Tácticas',c.tactics,'tactics')
   ].join('');
   return `<div class="party-card detected compact ${esc(c.vocationKey||'unknown')}">
    <div class="party-head"><span class="vocation-logo">${vocationIcon(c.vocationKey||c.vocation)}</span><div class="party-ident"><small>${esc(c.vocation||c.vocationKey||t('noData'))}</small><h4>${esc(c.name||'Personaje')}</h4></div><span class="party-role">${vocationRole(c.vocationKey||c.vocation)}</span><button class="party-build-btn" data-build-idx="${i}" title="Generar build para ${esc(c.name||'')}">🌳 Build</button><span class="member-status"><i></i>${t('active')}</span></div>
    <div class="party-stats compact-grid important-only">${important}</div>
   </div>`;
 }).join('')||'<div class="party-empty"><b>No hay una party activa.</b><small>Abre el panel Skills del juego y pulsa actualizar.</small></div>';
 document.querySelectorAll('[data-build-idx]').forEach(btn=>btn.onclick=()=>{
   const c=(data?.lastAnalysis?.party||[])[Number(btn.dataset.buildIdx)];
   if(c)goToBuildWithCharacter(c);
 });
}
const BUILD_GOAL_LABELS={dano:'⚔ Daño',atkspeed:'➶ Velocidad de ataque',xp:'✦ XP máxima',cura:'♥ Curación',tank:'♜ Tanque'};
const fmt1=n=>{const r=Math.round(Number(n||0)*10)/10;return Number.isInteger(r)?String(r):r.toFixed(1)};
function buildEngineReady(){return typeof BAIAK_BUILD_ENGINE!=='undefined'&&BAIAK_BUILD_ENGINE?.DATA}
function renderBuildElemOptions(){
 if(!buildEngineReady())return;
 const voc=$('buildVoc').value,goal=$('buildGoal').value,DATA=BAIAK_BUILD_ENGINE.DATA;
 const focus=DATA.VOC_FOCUS[voc];
 const showFocus=!!focus&&['dano','atkspeed','xp'].includes(goal);
 $('buildElemWrap').classList.toggle('hidden',!showFocus);
 if(showFocus)$('buildElem').innerHTML=focus.map(([e,lbl])=>`<option value="${esc(e)}">${esc(lbl)}</option>`).join('');
 $('buildVariantWrap').classList.toggle('hidden',goal!=='cura');
 const showTank=goal==='tank';
 $('buildTankWrap').classList.toggle('hidden',!showTank);
 if(showTank&&$('buildTank').dataset.init!=='1'){$('buildTank').innerHTML=DATA.TANK_FOCUS.map(([e,lbl])=>`<option value="${esc(e)}">${esc(lbl)}</option>`).join('');$('buildTank').dataset.init='1'}
}
function renderBuildPlan(plan,voc,level,pts,goal,code){
 const DATA=BAIAK_BUILD_ENGINE.DATA,tree=DATA.TREES[voc],full=BAIAK_BUILD_ENGINE.treeFullCost(tree);
 const vocLabel=DATA.VOCS[voc]?.label||voc;
 $('buildSummaryTitle').textContent=`${vocLabel} · ${BUILD_GOAL_LABELS[goal]||goal} · nivel ${level}`;
 $('buildPointsPill').textContent=`${fmtFull(plan.spent)} / ${fmtFull(pts)} pts`;
 const sums={atkPct:0,spellDmgPct:0,attackSpeedPct:0,critChance:0,critDmg:0,hpPct:0};
 const nodesAlloc=tree.nodes.filter(n=>plan.rank[n.id]>0).map(n=>({n,r:plan.rank[n.id]})).sort((a,b)=>b.n.tier-a.n.tier||a.n.col-b.n.col);
 nodesAlloc.forEach(({n,r})=>{if(n.per)for(const [k,v] of Object.entries(n.per))if(typeof v==='number'&&sums[k]!==undefined)sums[k]+=v*r});
 $('buildSummaryStats').innerHTML=`
  <div class="analytics-stat"><span>Ataque</span><b>+${fmt1(sums.atkPct)}%</b></div>
  <div class="analytics-stat"><span>Daño mágico</span><b>+${fmt1(sums.spellDmgPct)}%</b></div>
  <div class="analytics-stat"><span>Velocidad</span><b>+${fmt1(sums.attackSpeedPct)}%</b></div>
  <div class="analytics-stat"><span>Crítico</span><b>+${fmt1(sums.critChance)}%</b></div>
  <div class="analytics-stat"><span>Daño crítico</span><b>+${fmt1(sums.critDmg)}%</b><small>base 50%</small></div>
  <div class="analytics-stat"><span>HP</span><b>+${fmt1(sums.hpPct)}%</b></div>`;
 $('buildCodeOut').value=code;
 $('buildCodeMsg').textContent=`Árbol completo del ${vocLabel}: ${fmtFull(full)} pts · te faltan ${fmtFull(Math.max(0,full-pts))} pts para maximizarlo.`;
 $('buildNodeList').classList.toggle('empty',!nodesAlloc.length);
 $('buildNodeList').innerHTML=nodesAlloc.map(({n,r})=>`<div class="build-node-row"><span class="build-node-tier">T${n.tier}</span><div class="build-node-copy"><b>${esc(n.name)}</b><small>${esc(BAIAK_BUILD_ENGINE.nodeDesc(n,r))}</small></div><span class="build-node-rank">${r}/${n.maxRank}</span></div>`).join('')||'Sin puntos suficientes todavía.';
}
function generateBuild(){
 if(!buildEngineReady()){$('buildCodeMsg').textContent='Motor de build no cargado.';return}
 const voc=$('buildVoc').value,goal=$('buildGoal').value;
 const level=Math.max(0,parseInt($('buildLevel').value)||0);
 if(!level){$('buildCodeMsg').textContent='Ingresá un nivel.';return}
 const buildElem=$('buildElemWrap').classList.contains('hidden')?'':$('buildElem').value;
 const tankElem=$('buildTankWrap').classList.contains('hidden')?'':$('buildTank').value;
 const buildVariant=$('buildVariantWrap').classList.contains('hidden')?'pack':$('buildVariant').value;
 const pts=BAIAK_BUILD_ENGINE.pointsForLevel(level);
 const pctx={voc,buildElem,tankElem,buildVariant};
 const plan=BAIAK_BUILD_ENGINE.planBuild(voc,goal,pts,true,pctx);
 const code=BAIAK_BUILD_ENGINE.buildCodeFrom(voc,level,plan.rank);
 renderBuildPlan(plan,voc,level,pts,goal,code);
}
function switchTab(tabName){
 const btn=[...document.querySelectorAll('.tabs button')].find(b=>b.dataset.tab===tabName);
 if(!btn)return;
 document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===btn));
 document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===tabName));
 if(tabName==='bosses')loadBosses(false);
 if(tabName==='build')renderBuildElemOptions();
}
function applyCharacterToBuildForm(c){
 if(!c)return false;
 if(c.vocationKey&&BAIAK_BUILD_ENGINE?.DATA?.TREES?.[c.vocationKey])$('buildVoc').value=c.vocationKey;
 if(c.level)$('buildLevel').value=c.level;
 renderBuildElemOptions();
 return true;
}
function useActiveCharacterForBuild(){
 const c=(data?.lastAnalysis?.party||[])[0];
 if(!applyCharacterToBuildForm(c)){$('buildCodeMsg').textContent='No hay personaje detectado. Andá a Party y actualizá.';return}
 if($('buildLevel').value)generateBuild();
}
function goToBuildWithCharacter(c){
 if(!c)return;
 applyCharacterToBuildForm(c);
 switchTab('build');
 if($('buildLevel').value)generateBuild();
}
function importBuildCode(){
 if(!buildEngineReady())return;
 const code=$('buildImportCode').value.trim();
 if(!code){$('buildImportResult').innerHTML='';return}
 const dec=BAIAK_BUILD_ENGINE.decodeBuildCode(code);
 if(!dec||!dec.valid){$('buildImportResult').innerHTML='<p class="msg">Código inválido. Formato: BT1-K250-...</p>';return}
 const vocLabel=BAIAK_BUILD_ENGINE.DATA.VOCS[dec.voc]?.label||dec.voc;
 const nodes=[...dec.nodes].sort((a,b)=>b.node.tier-a.node.tier);
 $('buildImportResult').innerHTML=`<p class="msg">${esc(vocLabel)} · nivel ${dec.level??'?'} · ${fmtFull(dec.points)} puntos gastados</p><div class="ranking">${nodes.map(({node,rank})=>`<div class="build-node-row"><span class="build-node-tier">T${node.tier}</span><div class="build-node-copy"><b>${esc(node.name)}</b><small>${esc(BAIAK_BUILD_ENGINE.nodeDesc(node,rank))}</small></div><span class="build-node-rank">${rank}/${node.maxRank}</span></div>`).join('')}</div>`;
}
function renderHistory(){const all=[];Object.entries(data?.huntMeasurements||{}).forEach(([hunt,v])=>(v.sessions||[]).forEach(s=>all.push({...s,hunt,image:s.image||v.image})));all.sort((a,b)=>b.at-a.at);$('sessionCount').textContent=all.length;$('history').classList.toggle('empty',!all.length);
  const totalXp=all.reduce((a,v)=>a+Number(v.xpGained||0),0),totalGold=all.reduce((a,v)=>a+Number(v.goldGained||0),0),avgXph=all.length?all.reduce((a,v)=>a+Number(v.realXph||0),0)/all.length:0,avgGold=all.length?all.reduce((a,v)=>a+Number(v.realGoldph||0),0)/all.length:0,best=all.reduce((a,v)=>!a||Number(v.realXph)>Number(a.realXph)?v:a,null);
  if($('analyticsSummary'))$('analyticsSummary').innerHTML=`<div class="analytics-stat"><span>Sesiones</span><b>${all.length}</b></div><div class="analytics-stat"><span>XP total medida</span><b>${fmt(totalXp)}</b></div><div class="analytics-stat"><span>Gold total</span><b>${fmt(totalGold)}</b></div><div class="analytics-stat"><span>Promedio XP/h</span><b>${fmt(avgXph)}</b></div><div class="analytics-stat"><span>Promedio Gold/h</span><b>${fmt(avgGold)}</b></div><div class="analytics-stat"><span>Mejor sesión</span><b>${best?esc(best.hunt):'—'}</b><small>${best?fmt(best.realXph)+' XP/h':'—'}</small></div>`;
  $('history').innerHTML=all.map(s=>`<div class="history-item detailed">${logo(s)}<div><b>${esc(s.hunt)}</b><small>${new Date(s.at).toLocaleString(data.language==='pt'?'pt-BR':data.language==='en'?'en-US':'es-PE')}</small></div><span><small>XP Gain (5m)</small>${fmt(s.xpGained)} XP</span><span><small>Gold (5m)</small>${fmtFull(s.goldGained)} gold</span><span><small>XP/h real</small>${fmt(s.realXph)}</span><span><small>Gold/h real</small>${fmt(s.realGoldph)}</span><span class="difference ${diffClass(s.differencePct)}"><small>Vs. estimación</small>${diffText(s.differencePct)}</span></div>`).join('')||t('noMeasurements')}
const BOSS_STATIC_CATALOG=[{"name":"Shadowpelt","category":"archfoe","id":"shadowpelt","level":5},{"name":"The Blazing Rose","category":"archfoe","id":"the_blazing_rose","level":5},{"name":"Darkfang","category":"archfoe","id":"darkfang","level":15},{"name":"Bloodback","category":"archfoe","id":"bloodback","level":15},{"name":"The Lily of Night","category":"archfoe","id":"the_lily_of_night","level":15},{"name":"The Diamond Blossom","category":"archfoe","id":"the_diamond_blossom","level":15},{"name":"Black Vixen","category":"archfoe","id":"black_vixen","level":20},{"name":"Sharpclaw","category":"archfoe","id":"sharpclaw","level":20},{"name":"Leiden","category":"nemesis","id":"leiden","level":25},{"name":"Utua Stone Sting","category":"archfoe","id":"utua_stone_sting","level":35},{"name":"Brokul","category":"quest","id":"brokul","level":50},{"name":"Amenef the Burning","category":"archfoe","id":"amenef_the_burning","level":50},{"name":"Solid Frozen Horror","category":"nemesis","id":"solid_frozen_horror","level":50},{"name":"Ahau","category":"archfoe","id":"ahau","level":60},{"name":"Irgix The Flimsy","category":"archfoe","id":"irgix_the_flimsy","level":60},{"name":"Unaz the Mean","category":"archfoe","id":"unaz_the_mean","level":60},{"name":"Vok the Freakish","category":"archfoe","id":"vok_the_freakish","level":60},{"name":"Tanjis","category":"bane","id":"tanjis","level":60},{"name":"Kusuma","category":"archfoe","id":"kusuma","level":60},{"name":"Brain Head","category":"archfoe","id":"brain_head","level":70},{"name":"Neferi the Spy","category":"archfoe","id":"neferi_the_spy","level":70},{"name":"Sister Hetai","category":"archfoe","id":"sister_hetai","level":70},{"name":"Scarlett Etzel","category":"quest","id":"scarlett","level":80},{"name":"The Time Guardian","category":"archfoe","id":"the_time_guardian","level":80},{"name":"Dragonking Zyrtarch","category":"nemesis","id":"dragonking_zyrtarch","level":80},{"name":"Lloyd","category":"archfoe","id":"lloyd","level":80},{"name":"Mounted Thorn Knight","category":"nemesis","id":"mounted_thorn_knight","level":80},{"name":"Foreshock","category":"nemesis","id":"foreshock","level":80},{"name":"Sir Nictros","category":"archfoe","id":"sir_nictros","level":80},{"name":"Urmahlullu the Weakened","category":"quest","id":"urmahlullu","level":90},{"name":"Megasylvan Yselda","category":"archfoe","id":"megasylvan_yselda","level":90},{"name":"Obujos","category":"bane","id":"obujos","level":90},{"name":"Drume","category":"archfoe","id":"drume","level":90},{"name":"Vladrukh","category":"archfoe","id":"vladrukh","level":90},{"name":"Timira the Many-Headed","category":"archfoe","id":"timira_the_many_headed","level":90},{"name":"Grand Master Oberon","category":"quest","id":"oberon","level":100},{"name":"Ratmiral Blackwhiskers","category":"quest","id":"ratmiral","level":100},{"name":"Faceless Bane","category":"archfoe","id":"faceless_bane","level":100},{"name":"Lady Tenebris","category":"archfoe","id":"lady_tenebris","level":100},{"name":"Duke Krule","category":"archfoe","id":"duke_krule","level":100},{"name":"Rupture","category":"archfoe","id":"rupture","level":100},{"name":"Anomaly","category":"archfoe","id":"anomaly","level":100},{"name":"Ghulosh","category":"archfoe","id":"ghulosh","level":110},{"name":"Lokathmor","category":"archfoe","id":"lokathmor","level":110},{"name":"Mazzinor","category":"archfoe","id":"mazzinor","level":110},{"name":"The Dread Maiden","category":"archfoe","id":"the_dread_maiden","level":110},{"name":"Count Vlarkorth","category":"archfoe","id":"count_vlarkorth","level":110},{"name":"The Brainstealer","category":"archfoe","id":"the_brainstealer","level":110},{"name":"Earl Osam","category":"archfoe","id":"earl_osam","level":110},{"name":"The Baron from Below","category":"archfoe","id":"the_baron_from_below","level":120},{"name":"The Duke of the Depths","category":"archfoe","id":"the_duke_of_the_depths","level":120},{"name":"The Count of the Core","category":"archfoe","id":"the_count_of_the_core","level":120},{"name":"Lord Azaram","category":"archfoe","id":"lord_azaram","level":110},{"name":"Alptramun","category":"nemesis","id":"alptramun","level":110},{"name":"Jaul","category":"bane","id":"jaul","level":120},{"name":"Shulgrax","category":"archfoe","id":"shulgrax","level":130},{"name":"Dragon Pack","category":"archfoe","id":"dragon_pack","level":130},{"name":"Court Warlock","category":"archfoe","id":"court_warlock","level":130},{"name":"Outburst","category":"archfoe","id":"outburst","level":130},{"name":"Razzagorn","category":"archfoe","id":"razzagorn","level":130},{"name":"Tarbaz","category":"archfoe","id":"tarbaz","level":130},{"name":"Arbaziloth","category":"archfoe","id":"arbaziloth","level":130},{"name":"Gorzindel","category":"archfoe","id":"gorzindel","level":130},{"name":"The Monster","category":"archfoe","id":"the_monster","level":130},{"name":"Prince Drazzak","category":"archfoe","id":"prince_drazzak","level":140},{"name":"Lord Retro","category":"archfoe","id":"lord_retro","level":140},{"name":"Magma Bubble","category":"archfoe","id":"magma_bubble","level":140},{"name":"Ragiaz","category":"archfoe","id":"ragiaz","level":140},{"name":"Plagirath","category":"archfoe","id":"plagirath","level":140},{"name":"Urmahlullu the Immaculate","category":"archfoe","id":"urmahlullu_the_immaculate","level":140},{"name":"The Fear Feaster","category":"archfoe","id":"the_fear_feaster","level":150},{"name":"The Unwelcome","category":"archfoe","id":"the_unwelcome","level":150},{"name":"The Primal Menace","category":"archfoe","id":"the_primal_menace","level":150},{"name":"The Pale Worm","category":"archfoe","id":"the_pale_worm","level":150},{"name":"The Rootkraken","category":"archfoe","id":"the_rootkraken","level":150},{"name":"Eradicator","category":"archfoe","id":"eradicator","level":160},{"name":"World Devourer","category":"nemesis","id":"world_devourer","level":160},{"name":"King Zelos","category":"archfoe","id":"king_zelos","level":160},{"name":"The Scourge of Oblivion","category":"archfoe","id":"the_scourge_of_oblivion","level":180},{"name":"Goshnar's Cruelty","category":"archfoe","id":"goshnar_s_cruelty","level":190},{"name":"The Last Lore Keeper","category":"nemesis","id":"the_last_lore_keeper","level":200},{"name":"Goshnar's Greed","category":"archfoe","id":"goshnar_s_greed","level":200},{"name":"The Nightmare Beast","category":"quest","id":"the_nightmare_beast","level":210},{"name":"Mitmah Vanguard","category":"archfoe","id":"mitmah_vanguard","level":210},{"name":"Ichgahal","category":"archfoe","id":"ichgahal","level":210},{"name":"Goshnar's Hatred","category":"archfoe","id":"goshnar_s_hatred","level":220},{"name":"Goshnar's Malice","category":"archfoe","id":"goshnar_s_malice","level":220},{"name":"Goshnar's Spite","category":"archfoe","id":"goshnar_s_spite","level":220},{"name":"Bonelord's Phylactery","category":"nemesis","id":"bonelord_s_phylactery","level":230},{"name":"Ferumbras Mortal Shell","category":"nemesis","id":"ferumbras_mortal_shell","level":230},{"name":"Fatal Bug","category":"nemesis","id":"fatal_bug","level":230},{"name":"The Gravedigger","category":"archfoe","id":"the_gravedigger","level":230},{"name":"Ice Horror","category":"archfoe","id":"ice_horror","level":230},{"name":"Eldritch Dragon Lord","category":"archfoe","id":"eldritch_dragon_lord","level":240},{"name":"Chagorz","category":"archfoe","id":"chagorz","level":240},{"name":"Murcion","category":"archfoe","id":"murcion","level":240},{"name":"Vemiath","category":"archfoe","id":"vemiath","level":240},{"name":"Goshnar's Megalomania","category":"nemesis","id":"goshnar_s_megalomania","level":240},{"name":"Bakragore","category":"nemesis","id":"bakragore","level":340}];
function bossCategoryLabel(v){return v==='bane'?'Bane':v==='nemesis'?'Nemesis':v==='archfoe'?'Archfoe':v==='quest'?'Quest':'Boss'}
let bossSnapshot=null;
let bossQueue=[];
let draggedBossIndex=null;
function bossKey(b){return String(b?.id||norm(b?.name||''))}
async function saveBossQueue(){await chrome.storage.local.set({bossOwnQueue:bossQueue})}
function queueHas(b){const k=bossKey(b);return bossQueue.some(x=>bossKey(x)===k)}
function bossResultLabel(v){return ({pending:'Pendiente',running:'En combate',completed:'Completado',already_completed:'Ya completado',cooldown:'Cooldown',level_warning:'Nivel bajo',rejected:'Rechazado',error:'Error',defeat:'Derrota',unverified:'Sin verificar',skipped:'Omitido'})[v]||'Pendiente'}
function compactBossCharges(value){const text=String(value||'').trim();const match=text.match(/(\d+)\s*\/\s*(\d+)/);return match?`${match[1]}/${match[2]}`:(text||'—');}
function renderBosses(){
 const snap=bossSnapshot||{bosses:[],run:{}};
 const run=snap.run||{};
 $('bossCharges').textContent=compactBossCharges(snap.charges);$('bossQueueCount').textContent=bossQueue.length;$('bossDetectedCount').textContent=(snap.bosses||[]).length;
 $('bossProgress').textContent=`${Number(run.index||0)} / ${Number(run.total||bossQueue.length)}`;
 $('bossRunState').textContent=run.state==='running'?'Ejecutando':run.state==='paused'?'Pausado':run.state==='finished'?'Finalizado':run.state==='stopped'?'Detenido':(snap.modalOpen?'Listo':'Panel cerrado');
 $('bossCurrent').textContent=run.current||'—';
 const q=norm($('bossSearch')?.value),f=$('bossFilter')?.value||'all',maxLvl=maxPartyLevel();
 const liveByName=new Map((snap.bosses||[]).map(b=>[norm(b.name),b]));
 const catalog=BOSS_STATIC_CATALOG.map(base=>({...base,ready:false,status:'Estado pendiente de comprobar',...liveByName.get(norm(base.name))}));
 const rows=catalog.filter(b=>(!q||norm(b.name).includes(q))&&(f==='all'||(f==='ready'&&b.ready)||b.category===f)).sort((a,b)=>{
   const aOk=!maxLvl||Number(a.level||0)<=maxLvl,bOk=!maxLvl||Number(b.level||0)<=maxLvl;
   if(aOk!==bOk)return aOk?-1:1;
   return Number(b.level||0)-Number(a.level||0);
 });
 $('bossDetectedList').classList.toggle('empty',!rows.length);
 $('bossDetectedList').innerHTML=rows.map(b=>{const added=queueHas(b),warn=/level|nivel/i.test(b.status||''),locked=maxLvl&&Number(b.level||0)>maxLvl,image=b.image?`<img src="${esc(b.image)}" alt="${esc(b.name)}">`:`<span class="boss-image-placeholder">☠</span>`;return `<div class="boss-card ${b.ready?'ready':warn?'warning':'blocked'}${locked?' level-locked':''}" data-boss-key="${encodeURIComponent(bossKey(b))}"><button class="boss-card-select" data-boss-direct="${encodeURIComponent(bossKey(b))}" title="Seleccionar ${esc(b.name)}"><span class="boss-card-image">${image}</span><b>${esc(b.name)}</b><small>${bossCategoryLabel(b.category)} · Nivel ${b.level??'?'}+</small><em>${esc(b.status|| (b.ready?'Disponible':'Estado pendiente de comprobar'))}</em></button><button class="boss-add boss-card-add" data-boss-add="${encodeURIComponent(bossKey(b))}" ${added?'disabled':''} title="Agregar a la lista">${added?'✓':'+'}</button></div>`}).join('')||'No hay bosses con ese filtro.';
 document.querySelectorAll('[data-boss-add]').forEach(btn=>btn.onclick=async()=>{const key=decodeURIComponent(btn.dataset.bossAdd),b=catalog.find(x=>bossKey(x)===key);if(!b||queueHas(b))return;bossQueue.push({id:b.id||'',name:b.name,category:b.category,image:b.image||'',status:'pending'});await saveBossQueue();renderBosses()});
 document.querySelectorAll('[data-boss-direct]').forEach(btn=>btn.onclick=async()=>{const key=decodeURIComponent(btn.dataset.bossDirect),b=catalog.find(x=>bossKey(x)===key);if(!b)return;$('bossMessage').textContent=`Seleccionando ${b.name}...`;const r=await message({type:'BAIAK_BOSS_SELECT',boss:{id:b.id,name:b.name}});$('bossMessage').textContent=r.ok?`${b.name} seleccionado en el juego.`:(r.error||'No se pudo seleccionar el boss.');});
 // El estado mostrado en "Lista propia" se calcula contra el catálogo detectado en vivo
 // (liveByName, leído recién del DOM real del juego), no contra una corrida vieja: así
 // "Cooldown" siempre refleja lo que el juego muestra ahora, no un dato archivado.
  $('bossQueueList').classList.toggle('empty',!bossQueue.length);
  const runActive=run.state==='running'||run.state==='paused';
  const namedQueueIndex=run.current?bossQueue.findIndex(b=>norm(b.name)===norm(run.current)):-1;
  const currentQueueIndex=namedQueueIndex>=0?namedQueueIndex:Number(run.index||0)-1;
  $('bossQueueList').innerHTML=bossQueue.map((b,i)=>{
    let dispStatus=b.status||'pending';
    // Al llegar al boss N, los anteriores ya terminaron: victoria y derrota
    // consumen la misma entrada. Esto evita que una lectura atrasada del panel
    // los vuelva a pintar como pendientes.
    if(runActive&&currentQueueIndex>=0){
      if(i<currentQueueIndex)dispStatus='already_completed';
      else if(i===currentQueueIndex)dispStatus='running';
    }
    // El catálogo del juego puede confirmar un pendiente, pero jamás debe
    // degradar un resultado que ya confirmó la propia ejecución.
    if(dispStatus==='pending'){
      const live=liveByName.get(norm(b.name));
      if(live){
        if(live.completed)dispStatus='already_completed';
        else if(live.cooldown)dispStatus='cooldown';
      }
   }
     // La cola no representa vida: su estado se decide por el aviso de derrota.
     return `<div class="boss-queue-item" draggable="true" data-queue-index="${i}"><span>${i+1}</span><div class="boss-queue-copy"><b>${esc(b.name)}</b><small>${bossCategoryLabel(b.category)} · <em class="boss-result-${esc(dispStatus)}">${bossResultLabel(dispStatus)}</em></small></div><div class="queue-controls"><button class="boss-move" data-up="${i}" title="Subir">↑</button><button class="boss-move" data-down="${i}" title="Bajar">↓</button><button class="boss-remove" data-remove="${i}" title="Quitar">✕</button></div></div>`;
 }).join('')||'Agrega bosses desde el panel izquierdo.';
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{bossQueue.splice(Number(b.dataset.remove),1);await saveBossQueue();renderBosses()});
 document.querySelectorAll('[data-up]').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.up);if(i>0){[bossQueue[i-1],bossQueue[i]]=[bossQueue[i],bossQueue[i-1]];await saveBossQueue();renderBosses()}});
 document.querySelectorAll('[data-down]').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.down);if(i<bossQueue.length-1){[bossQueue[i+1],bossQueue[i]]=[bossQueue[i],bossQueue[i+1]];await saveBossQueue();renderBosses()}});
 document.querySelectorAll('[data-queue-index]').forEach(row=>{row.ondragstart=()=>{draggedBossIndex=Number(row.dataset.queueIndex);row.classList.add('dragging')};row.ondragend=()=>row.classList.remove('dragging');row.ondragover=e=>e.preventDefault();row.ondrop=async e=>{e.preventDefault();const to=Number(row.dataset.queueIndex);if(draggedBossIndex==null||draggedBossIndex===to)return;const [item]=bossQueue.splice(draggedBossIndex,1);bossQueue.splice(to,0,item);draggedBossIndex=null;await saveBossQueue();renderBosses()}});
}
async function loadBosses(open=false){try{$('bossMessage').textContent=open?'Abriendo panel de bosses...':'Leyendo bosses...';const r=await message({type:open?'BAIAK_BOSS_OPEN':'BAIAK_BOSS_STATUS',force:open});if(!r.ok)throw Error(r.error);bossSnapshot=r.result;const currentContentScript=!!r.result.contentScriptVersion;const st=await chrome.storage.local.get({bossOwnQueue:[],dailyBossAutoStart:true});bossQueue=Array.isArray(st.bossOwnQueue)?st.bossOwnQueue:[];
  // Solo se refleja la cola "en vivo" del content script mientras hay una corrida activa
  // (running/paused): esa cola queda pegada en memoria del content script aun después de
  // terminar, y si se adopta siempre, pisa cualquier cosa que el usuario acaba de limpiar
  // o editar acá — la lista "reaparecía sola" a los pocos segundos por esto.
  const runActive=r.result.run?.state==='running'||r.result.run?.state==='paused';
  if(runActive&&Array.isArray(r.result.run?.queue)&&r.result.run.queue.length)bossQueue=r.result.run.queue;
  if($('bossDailyAuto')&&document.activeElement!==$('bossDailyAuto'))$('bossDailyAuto').checked=!!st.dailyBossAutoStart;renderBosses();
  // Mientras el Auto Boss está corriendo (o recién terminó), el mensaje del propio run
  // (qué boss se saltó por cooldown, resumen final, etc.) tiene prioridad sobre el genérico.
  const runState=r.result.run?.state,runMessage=r.result.run?.message;
  const showRunMessage=runMessage&&['running','paused','finished','stopped'].includes(runState);
  $('bossMessage').textContent=!currentContentScript?'Actualización instalada: recargá la pestaña de Baiak Idle (Ctrl+R) antes de iniciar Auto Boss.':(showRunMessage?runMessage:(r.result.bosses?.length?'Bosses actualizados automáticamente.':'No se pudo cargar la lista de bosses.'));
}catch(e){$('bossMessage').textContent=e.message}}
const bossMatchKey=s=>norm(s).replace(/[‘’ʼ‛]/g,"'");
async function addBossesFromBulkText(){
 const raw=$('bossBulkInput')?.value||'';
 const lines=raw.split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length){$('bossBulkResult').textContent='Pegá al menos un nombre.';return}
 const byKey=new Map(BOSS_STATIC_CATALOG.map(b=>[bossMatchKey(b.name),b]));
 let added=0,already=0;const notFound=[];
 for(const line of lines){
  const b=byKey.get(bossMatchKey(line));
  if(!b){notFound.push(line);continue}
  if(queueHas(b)){already++;continue}
  bossQueue.push({id:b.id||'',name:b.name,category:b.category,image:b.image||'',status:'pending'});
  added++;
 }
 if(added){await saveBossQueue();renderBosses()}
 const parts=[];
 if(added)parts.push(`${added} agregado${added===1?'':'s'}`);
 if(already)parts.push(`${already} ya estaba${already===1?'':'n'} en la lista`);
 if(notFound.length)parts.push(`sin coincidencia: ${notFound.slice(0,6).join(', ')}${notFound.length>6?` (+${notFound.length-6})`:''}`);
 $('bossBulkResult').textContent=parts.join(' · ')||'Nada para agregar.';
 if(added)$('bossBulkInput').value='';
}
async function startBosses(){try{if(!bossQueue.length)throw Error('Agrega al menos un boss a la lista.');bossQueue=bossQueue.map(({health,...b})=>({...b,status:'pending'}));await saveBossQueue();$('bossMessage').textContent='Iniciando Auto Boss...';const r=await message({type:'BAIAK_BOSS_START_OWN',queue:bossQueue});if(!r.ok)throw Error(r.error);$('bossMessage').textContent=r.message||'Auto Boss iniciado.';setTimeout(()=>loadBosses(false),700)}catch(e){$('bossMessage').textContent=e.message}}
async function bossControl(type,label){try{const r=await message({type});if(!r.ok)throw Error(r.error);$('bossMessage').textContent=r.message||label;setTimeout(()=>loadBosses(false),300)}catch(e){$('bossMessage').textContent=e.message}}
function renderAuto(){['enterAt','returnAt','intervalSeconds','returnMode','minImprovement'].forEach(id=>{const el=$(id);if(el&&document.activeElement!==el)el.value=data?.[id]??DEFAULTS[id]});if(document.activeElement!==$('staminaEnabled'))$('staminaEnabled').checked=!!data?.staminaEnabled;$('status').textContent=data?.lastStatus||'—'}
async function refreshStorage(){data=await chrome.storage.local.get(DEFAULTS);if(data?.lastAnalysis?.ranked){data.lastAnalysis.ranked=data.lastAnalysis.ranked.map(row=>withHuntImage(row));}applyLanguage();renderAdvisor();renderMeasurement();renderAuto()}
async function analyze(){try{$('analysisMsg').textContent=t('analyzing');const r=await message({type:'BAIAK_ANALYZE'});if(!r.ok)throw Error(r.error);data.lastAnalysis=r.result;await refreshStorage();$('analysisMsg').textContent=`${t('ready')}: ${r.result.ranked.length} hunts.`}catch(e){$('analysisMsg').textContent=e.message}}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
if($('buildVoc'))$('buildVoc').onchange=renderBuildElemOptions;
if($('buildGoal'))$('buildGoal').onchange=renderBuildElemOptions;
if($('buildGenerate'))$('buildGenerate').onclick=generateBuild;
if($('buildUseChar'))$('buildUseChar').onclick=useActiveCharacterForBuild;
if($('buildImportCode'))$('buildImportCode').oninput=importBuildCode;
if($('buildCodeCopy'))$('buildCodeCopy').onclick=async()=>{
 const val=$('buildCodeOut').value;
 if(!val)return;
 try{await navigator.clipboard.writeText(val)}
 catch(e){$('buildCodeOut').removeAttribute('readonly');$('buildCodeOut').select();document.execCommand('copy');$('buildCodeOut').setAttribute('readonly','')}
 const btn=$('buildCodeCopy'),original=btn.textContent;
 btn.textContent='✓ Copiado';
 setTimeout(()=>{btn.textContent=original},1500);
};
document.querySelectorAll('[data-objective]').forEach(b=>b.onclick=async()=>{document.querySelectorAll('[data-objective]').forEach(x=>x.classList.toggle('active',x===b));data.objective=b.dataset.objective;await chrome.storage.local.set({objective:data.objective});renderTop()});
$('search').oninput=renderSuggestions;$('huntFilter').oninput=renderAllHunts;$('analyze').onclick=analyze;$('refreshParty').onclick=analyze;
async function setLanguage(v){await chrome.storage.local.set({language:v});data.language=v;applyLanguage();renderAdvisor();renderMeasurement();renderAuto()}
const languageTrigger=$('languageTrigger'),languageMenu=$('languageMenu');function closeLanguageMenu(){languageMenu?.classList.remove('open');languageTrigger?.setAttribute('aria-expanded','false')}languageTrigger?.addEventListener('click',e=>{e.stopPropagation();const open=languageMenu.classList.toggle('open');languageTrigger.setAttribute('aria-expanded',String(open))});document.querySelectorAll('#language [data-lang]').forEach(b=>b.onclick=async e=>{e.stopPropagation();await setLanguage(b.dataset.lang);closeLanguageMenu()});document.addEventListener('click',e=>{if(!$('language')?.contains(e.target))closeLanguageMenu()});if($('settingsLanguage'))$('settingsLanguage').onchange=e=>setLanguage(e.target.value);
if($('bossRefresh'))$('bossRefresh').onclick=()=>loadBosses(false);if($('bossOpen'))$('bossOpen').onclick=()=>loadBosses(true);if($('bossStart'))$('bossStart').onclick=startBosses;if($('bossSearch'))$('bossSearch').oninput=renderBosses;if($('bossFilter'))$('bossFilter').onchange=renderBosses;if($('bossPause'))$('bossPause').onclick=()=>bossControl('BAIAK_BOSS_PAUSE','Auto Boss pausado.');if($('bossResume'))$('bossResume').onclick=()=>bossControl('BAIAK_BOSS_RESUME','Auto Boss reanudado.');if($('bossStop'))$('bossStop').onclick=()=>bossControl('BAIAK_BOSS_STOP','Auto Boss detenido.');if($('bossClear'))$('bossClear').onclick=async()=>{
 if(!bossQueue.length){$('bossMessage').textContent='La lista ya está vacía.';return}
 if(!confirm(`¿Eliminar los ${bossQueue.length} bosses de la lista? Podés volver a agregarlos pegándolos en el cuadro de arriba.`))return;
 bossQueue=[];await saveBossQueue();renderBosses();
 $('bossMessage').textContent='Lista eliminada. Pegá los nombres de nuevo arriba para volver a agregarlos.';
};
if($('bossDailyAuto'))$('bossDailyAuto').onchange=()=>chrome.storage.local.set({dailyBossAutoStart:$('bossDailyAuto').checked});
if($('bossBulkAdd'))$('bossBulkAdd').onclick=addBossesFromBulkText;
$('save').onclick=async()=>{const o={staminaEnabled:$('staminaEnabled').checked,enterAt:Number($('enterAt').value),returnAt:Number($('returnAt').value),intervalSeconds:Number($('intervalSeconds').value),returnMode:$('returnMode').value,minImprovement:Number($('minImprovement').value)};if(o.returnAt<=o.enterAt){$('staminaMsg').textContent=t('exitGreater');return}await chrome.storage.local.set(o);$('staminaMsg').textContent=t('saved')};
$('testNow').onclick=async()=>{try{const r=await message({type:'BAIAK_STAMINA_NOW'});$('staminaMsg').textContent=r.ok?t('ready'):r.error}catch(e){$('staminaMsg').textContent=e.message}};$('staminaEnabled').onchange=async()=>chrome.storage.local.set({staminaEnabled:$('staminaEnabled').checked});chrome.storage.onChanged.addListener(()=>refreshStorage());setInterval(()=>refreshStorage().catch(()=>{}),3000);setInterval(updateMeasurementClock,250);setInterval(()=>{if(document.querySelector('.tabs button[data-tab="bosses"]')?.classList.contains('active'))loadBosses(false).catch(()=>{})},2000);
(async()=>{let online=false;try{const r=await message({type:'BAIAK_STATUS'});online=!!r.ok;$('connection').classList.toggle('ok',online);$('connection').querySelector('b').textContent=online?'ONLINE':'OFFLINE'}catch{$('connection').querySelector('b').textContent='OFFLINE'}await refreshStorage();const stale=!data?.lastAnalysis||Date.now()-Number(data.lastAnalysis.at||0)>5*60*1000;if(online&&stale)await analyze();else if(data?.lastAnalysis)$('analysisMsg').textContent=`${data.lastAnalysis.ranked?.length||0} ${t('huntsLoaded')}`})();
