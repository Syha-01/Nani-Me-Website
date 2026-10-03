// Tsuzuku player lab: four designs over one working player.
(() => {
  const V = new URLSearchParams(location.search).get('v');
  if (!['c', 'd', 'f', 'g'].includes(V)) { document.getElementById('picker').hidden = false; return; }
  document.getElementById('app').hidden = false;
  const SHOT = /shot/.test(location.hash);

  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), ui = $('ui'), video = $('video'), pic = $('pic'), cueEl = $('cue'), toastEl = $('toast');

  // ── content ────────────────────────────────────────────
  const SHOW = 'Sample Anime';
  const EPS = [
    'Morning in the Meadow', 'The Butterfly', 'Three Troublemakers', 'A Bad Day', 'The Plan',
    'Traps', 'Payback', 'The Squirrel', 'Gliding', 'Back to the Meadow', 'Credits Roll', 'Special',
  ];
  const HUES = [[14, 159, 173], [109, 69, 194], [68, 83, 201], [47, 143, 76], [148, 55, 181], [217, 68, 60],
    [219, 122, 15], [201, 58, 110], [38, 113, 217], [63, 74, 92], [15, 159, 173], [109, 69, 194]];
  const thumb = (i) => { const [r, g, b] = HUES[i % HUES.length]; return `background:linear-gradient(135deg, rgb(${r},${g},${b}), rgba(${r},${g},${b},.45))`; };
  const OP = [20, 95];            // the "opening", marked on the bar
  const START = 14;
  const QUALITIES = [['Auto', 'adaptive'], ['1080p', 'MP4'], ['720p', 'MP4'], ['360p', 'MP4']];
  const AUDIO = [['Japanese', 'subbed'], ['English', 'dubbed']];
  const SUBS = ['Off', 'English', 'Español'];
  const TRANSLATE = ['Do not translate', 'Français', 'Português', 'Deutsch'];
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const FITS = [['contain', 'Fit', 'The whole picture'], ['inset', 'Zoom out', 'Smaller, with a border'],
    ['cover', 'Zoom', 'Fills the screen, trims the edges'], ['fill', 'Stretch', 'Fills the screen, bends the picture'],
    ['16:9', '16:9', 'Held to widescreen'], ['4:3', '4:3', 'Held to the old TV shape']];
  const SERVERS = [['Server 1', 'MegaPlay', 'fast'], ['Server 2', 'VidPlay', ''], ['Server 3', 'HiAnime', 'backup']];
  const LINES = [
    'Another beautiful morning in the meadow.', 'Is that... a butterfly?', 'Leave him alone, you three!',
    'They think this is funny.', 'Not for long.', 'Everything is ready.', 'Now we wait.', 'Here they come!',
  ];

  // ── state ──────────────────────────────────────────────
  const st = {
    ep: 2, controls: true, panel: null, sub: null, locked: false,
    quality: 'Auto', audio: 'Japanese', subs: 'English', translate: 'Do not translate',
    speed: 1, fit: 'contain', server: 0, upnext: false, upnextGone: false,
  };

  // ── media, with a fake clock if the video will not load ─
  let fake = null;
  const DUR_FALLBACK = 596;
  const M = {
    t: () => fake ? fake.t : video.currentTime || 0,
    dur: () => fake ? DUR_FALLBACK : (isFinite(video.duration) && video.duration) || DUR_FALLBACK,
    paused: () => fake ? fake.paused : video.paused,
    play: () => { if (fake) fake.paused = false; else { video.muted = false; video.play().catch(() => { video.muted = true; video.play().catch(() => {}); }); } },
    pause: () => { if (fake) fake.paused = true; else video.pause(); },
    seek: (t) => { t = Math.max(0, Math.min(M.dur() - 0.2, t)); if (fake) fake.t = t; else video.currentTime = t; },
    rate: (r) => { if (fake) fake.rate = r; else video.playbackRate = r; },
    buffered: () => {
      if (fake) return Math.min(1, (fake.t + 60) / DUR_FALLBACK);
      const b = video.buffered, t = video.currentTime;
      for (let i = 0; i < b.length; i++) if (b.start(i) <= t + 1 && b.end(i) >= t) return b.end(i) / M.dur();
      return 0;
    },
  };
  const goFake = () => {
    if (fake) return;
    fake = { t: START, paused: false, rate: st.speed, last: performance.now() };
    pic.classList.add('fake');
  };
  // No real video: the drawn scene and its own clock stand in for one.
  goFake();

  // ── helpers ────────────────────────────────────────────
  const I = (n, c = '') => `<ion-icon name="${n}"${c ? ` class="${c}"` : ''}></ion-icon>`;
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };
  const fitLabel = () => FITS.find((f) => f[0] === st.fit)[1];
  const speedLabel = () => st.speed === 1 ? 'Normal' : `${st.speed}x`;
  let toastT;
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 1100); };
  let hideT;
  const bump = () => {
    clearTimeout(hideT);
    hideT = setTimeout(() => { if (!M.paused() && !st.panel && !dragging) { st.controls = false; render(); } }, 3500);
  };
  const epState = (i) => i < st.ep ? 'Watched' : i === st.ep ? `${fmt(M.t())} in` : '24 min';
  const epPct = (i) => i < st.ep ? 1 : i === st.ep ? M.t() / M.dur() : 0;

  const seekBar = () => {
    const d = M.dur();
    return `<div class="seek js-seek"><div class="track"><div class="buf js-buf"></div>
      <div class="fill js-fill"></div><div class="mark" style="left:${OP[0] / d * 100}%;width:${(OP[1] - OP[0]) / d * 100}%"></div></div>
      <div class="knob js-knob"></div><div class="bubble js-bubble"></div></div>`;
  };
  const skipBack = (cls = '') => `<div class="skipbtn ${cls}" data-act="back10">${I('reload-outline', 'mirror')}<span>10</span></div>`;
  const skipFwd = (cls = '') => `<div class="skipbtn ${cls}" data-act="fwd10">${I('reload-outline')}<span>10</span></div>`;
  const playIcon = () => M.paused() ? 'play' : 'pause';
  const title = () => `<div class="t14">${SHOW}</div><div class="t12m">Episode ${st.ep + 1} · ${st.audio === 'Japanese' ? 'SUB' : 'DUB'} · ${st.quality === 'Auto' ? '720p' : st.quality}</div>`;
  const skipChip = (style) => `<div class="skipop chip ${style} js-skipop hide" data-act="skipop">${I('play-forward')}Skip opening</div>`;

  const epCard = (i) => `<div class="ep${i === st.ep ? ' on' : ''}" data-act="ep" data-i="${i}">
      <div class="th" style="${thumb(i)}">${i + 1}${i === st.ep ? `<div class="now">${I('play')}</div>` : ''}<div class="pb"><i style="width:${epPct(i) * 100}%"></i></div></div>
      <div class="meta"><b>${EPS[i]}</b><small>${epState(i)}</small></div></div>`;

  // ── panels shared by C, F, G (C's settings) ────────────
  const avPanel = () => `<div class="panel full">
      <div class="x" data-act="close">${I('close')}</div>
      <div class="cols">
        <div><h4>Audio</h4>${AUDIO.map(([a, n]) => `<div class="opt${st.audio === a ? ' on' : ''}" data-act="set" data-k="audio" data-val="${a}">${st.audio === a ? I('checkmark') : '<span class="sp"></span>'}${a} <small>${n}</small></div>`).join('')}</div>
        <div><h4>Subtitles</h4>${SUBS.map((s) => `<div class="opt${st.subs === s ? ' on' : ''}" data-act="set" data-k="subs" data-val="${s}">${st.subs === s ? I('checkmark') : '<span class="sp"></span>'}${s}</div>`).join('')}
          ${st.subs !== 'Off' ? `<div class="opt" data-act="sub" data-sub="translate"><span class="sp"></span>Translate… <small>${st.translate === 'Do not translate' ? 'off' : st.translate}</small></div>` : ''}</div>
        <div><h4>Speed</h4>${SPEEDS.map((s) => `<div class="opt${st.speed === s ? ' on' : ''}" data-act="set" data-k="speed" data-val="${s}">${st.speed === s ? I('checkmark') : '<span class="sp"></span>'}${s === 1 ? 'Normal' : `${s}x`}</div>`).join('')}</div>
      </div></div>`;
  const translatePanel = () => `<div class="panel full">
      <div class="x" data-act="close">${I('close')}</div>
      <div class="cols"><div><h4>Translate subtitles to</h4>
        ${TRANSLATE.map((s) => `<div class="opt${st.translate === s ? ' on' : ''}" data-act="set" data-k="translate" data-val="${s}">${st.translate === s ? I('checkmark') : '<span class="sp"></span>'}${s}${s !== 'Do not translate' ? ' <small>done on your phone</small>' : ''}</div>`).join('')}
        <div class="opt" data-act="sub" data-sub="" style="margin-top:8px">${I('arrow-back')}Back</div>
      </div></div></div>`;

  const menuPop = () => {
    const back = (t) => `<div class="mi head" data-act="sub" data-sub="">${I('arrow-back')}<div class="l">${t}</div></div><div class="line"></div>`;
    let body;
    if (st.sub === 'quality') body = back('Quality') + QUALITIES.map(([q, n]) => `<div class="mi" data-act="set" data-k="quality" data-val="${q}"><div class="l">${q}<small>${n}</small></div>${st.quality === q ? I('checkmark', 'chk') : ''}</div>`).join('');
    else if (st.sub === 'screen') body = back('Screen') + FITS.map(([k, l, n]) => `<div class="mi" data-act="set" data-k="fit" data-val="${k}"><div class="l">${l}<small>${n}</small></div>${st.fit === k ? I('checkmark', 'chk') : ''}</div>`).join('');
    else if (st.sub === 'server') body = back('Server') + SERVERS.map(([s, h, n], i) => `<div class="mi" data-act="set" data-k="server" data-val="${i}"><div class="l">${s}<small>${h}${n ? ` · ${n}` : ''}</small></div>${st.server === i ? I('checkmark', 'chk') : ''}</div>`).join('');
    else body = `
      <div class="mi" data-act="sub" data-sub="quality">${I('options-outline')}<div class="l">Quality</div><div class="v">${st.quality}</div>${I('chevron-forward', 'ch')}</div>
      <div class="mi" data-act="sub" data-sub="screen">${I('crop-outline')}<div class="l">Screen</div><div class="v">${fitLabel()}</div>${I('chevron-forward', 'ch')}</div>
      <div class="mi" data-act="sub" data-sub="server">${I('server-outline')}<div class="l">Server</div><div class="v">${st.server + 1} of 3</div>${I('chevron-forward', 'ch')}</div>
      <div class="line"></div>
      <div class="mi" data-act="pip">${I('browsers-outline')}<div class="l">Picture-in-picture</div></div>
      <div class="mi" data-act="full">${I(document.fullscreenElement ? 'contract-outline' : 'expand-outline')}<div class="l">${document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'}</div></div>`;
    return `<div class="scrim" data-act="close"></div><div class="panel pop">${body}</div>`;
  };

  const epsFull = () => `<div class="panel full eps-full"><div class="ttl">Episodes</div><div class="x" data-act="close">${I('close')}</div>
      <div class="grid">${EPS.map((_, i) => epCard(i)).join('')}</div></div>`;

  const strip = () => `<div class="scrim" data-act="close"></div><div class="panel strip">
      <div class="hd"><b>Episodes</b><small>${st.ep} of ${EPS.length} watched</small><div class="grow"></div><div class="ib" data-act="close" style="font-size:20px">${I('chevron-down')}</div></div>
      <div class="lane js-lane">${EPS.map((_, i) => epCard(i)).join('')}</div></div>`;

  const upNext = () => {
    const n = st.ep + 1, left = Math.ceil(M.dur() - M.t());
    return `<div class="upnext"><div class="th" style="${thumb(n)}">${n + 1}</div><div class="grow">
      <small>Up next · <span class="js-left">${left}</span>s</small><b>${n + 1}. ${EPS[n]}</b>
      <div class="btns"><div class="chip solid" data-act="next">${I('play')}Play now</div><div class="chip" data-act="noupnext">${I('close')}</div></div></div></div>`;
  };

  const lockUI = () => `<div class="lockbtn" data-act="unlock"><div class="ring">${I('lock-closed')}</div>Tap to unlock</div>`;

  // ── versions ───────────────────────────────────────────
  const prevOk = () => st.ep > 0, nextOk = () => st.ep < EPS.length - 1;

  function renderC() {
    const panel = st.panel === 'av' ? (st.sub === 'translate' ? translatePanel() : avPanel())
      : st.panel === 'menu' ? menuPop() : st.panel === 'episodes' ? epsFull() : '';
    const controls = !st.controls ? '' : `
      <div class="grad-top"></div><div class="grad-bot"></div>
      <div class="top row">
        <div class="ib" data-act="back">${I('arrow-back')}</div>
        <div class="mid">${title()}</div><div class="grow"></div>
        <div class="chip" data-act="open" data-p="menu" data-sub="server">Server ${st.server + 1}/3</div>
        <div class="ib" data-act="open" data-p="menu" style="font-size:20px">${I('ellipsis-vertical')}</div>
      </div>
      <div class="centre">${skipBack('hit')}<div class="play hit" data-act="play">${I(playIcon())}</div>${skipFwd('hit')}</div>
      <div class="bottom">
        <div class="row" style="gap:14px">${seekBar()}<div class="tn js-left">-0:00</div></div>
        <div class="row labels">
          <div class="lb" data-act="open" data-p="av">${I('speedometer-outline')}Speed (${st.speed}x)</div>
          <div class="lb" data-act="lock">${I('lock-open-outline')}Lock</div>
          <div class="lb" data-act="open" data-p="episodes">${I('albums-outline')}Episodes</div>
          <div class="lb" data-act="open" data-p="av">${I('chatbox-ellipses-outline')}Audio &amp; subtitles</div>
          <div class="lb${nextOk() ? '' : ' off'}" data-act="next">${I('play-skip-forward-outline')}Next episode</div>
        </div>
      </div>`;
    return `<div class="vc">${controls}${skipChip('solid')}${panel}</div>`;
  }

  function renderD() {
    const back = (t) => `<div class="hd" data-act="sub" data-sub="" style="cursor:pointer">${I('arrow-back')}${t}</div>`;
    let panel = '';
    if (st.panel === 'card' && st.sub === 'server') {
      panel = `<div class="scrim" data-act="close"></div><div class="panel card narrow">${back('Server')}${SERVERS.map(([s, h, n], i) => `<div class="li${st.server === i ? ' on' : ''}" data-act="set" data-k="server" data-val="${i}">${s}<small>${h}${n ? ` · ${n}` : ''}</small>${st.server === i ? I('checkmark', 'chk') : ''}</div>`).join('')}</div>`;
    } else if (st.panel === 'card') {
      const chips = (k, list, lab = (x) => x) => list.map((x) => `<div class="c${String(st[k]) === String(x) ? ' on' : ''}" data-act="set" data-k="${k}" data-val="${x}">${lab(x)}</div>`).join('');
      panel = `<div class="scrim" data-act="close"></div><div class="panel card">
        <div class="pair">
          <div class="grp"><div class="gl">Quality <span>${st.quality === 'Auto' ? '720p now' : ''}</span></div><div class="chips">${chips('quality', QUALITIES.map((q) => q[0]))}</div></div>
          <div class="grp"><div class="gl">Audio</div><div class="chips">${chips('audio', AUDIO.map((a) => a[0]))}</div></div>
        </div>
        <div class="grp"><div class="gl">Speed</div><div class="chips">${chips('speed', SPEEDS, (s) => s === 1 ? '1x' : s)}</div></div>
        <div class="grp"><div class="gl">Screen</div><div class="chips">${FITS.map(([k, l]) => `<div class="c${st.fit === k ? ' on' : ''}" data-act="set" data-k="fit" data-val="${k}">${l}</div>`).join('')}</div></div>
        <div class="links">
          <div class="link" data-act="sub" data-sub="server">${I('server-outline')}Server<span class="v">${st.server + 1} of 3 ›</span></div>
          <div class="link" data-act="pip">${I('browsers-outline')}Picture-in-picture</div>
        </div></div>`;
    } else if (st.panel === 'subs') {
      panel = `<div class="scrim" data-act="close"></div><div class="panel card narrow">
        <div class="hd">${I('text-outline')}Subtitles</div>
        ${SUBS.map((s) => `<div class="li${st.subs === s ? ' on' : ''}" data-act="set" data-k="subs" data-val="${s}">${s}${st.subs === s ? I('checkmark', 'chk') : ''}</div>`).join('')}
        ${st.subs !== 'Off' ? `<div class="hd" style="margin-top:8px;font-size:12px;color:var(--text3)">TRANSLATE TO</div>${TRANSLATE.map((s) => `<div class="li${st.translate === s ? ' on' : ''}" data-act="set" data-k="translate" data-val="${s}">${s}${st.translate === s ? I('checkmark', 'chk') : ''}</div>`).join('')}` : ''}
      </div>`;
    } else if (st.panel === 'episodes') {
      panel = `<div class="scrim" data-act="close"></div><div class="panel card narrow" style="width:340px">
        <div class="hd">${I('albums-outline')}Episodes</div>
        ${EPS.map((t, i) => `<div class="ep-li${i === st.ep ? ' on' : ''}" data-act="ep" data-i="${i}"><div class="th" style="${thumb(i)}">${i + 1}<div class="pb" style="position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.25)"><i style="display:block;height:100%;background:var(--primary);width:${epPct(i) * 100}%"></i></div></div><div class="grow"><b>${t}</b><small>${epState(i)}</small></div></div>`).join('')}
      </div>`;
    }
    const controls = !st.controls ? '' : `
      <div class="tl glass row cap">
        <div class="ib" data-act="back">${I('arrow-back')}</div>
        <div style="min-width:0">${title()}</div>
      </div>
      <div class="tr glass row cap">
        <div class="chip ghost" data-act="open" data-p="card" data-sub="server">Server ${st.server + 1}/3</div>
        <div class="sep"></div>
        <div class="ib" data-act="lock" style="font-size:20px;padding:6px">${I('lock-open-outline')}</div>
        <div class="chip ghost" data-act="open" data-p="card">${st.speed}x</div>
      </div>
      <div class="centre">
        <div class="round glass skipbtn hit" data-act="back10">${I('reload-outline', 'mirror')}<span>10</span></div>
        <div class="wplay hit" data-act="play">${I(playIcon())}</div>
        <div class="round glass skipbtn hit" data-act="fwd10">${I('reload-outline')}<span>10</span></div>
      </div>
      <div class="dock glass row cap">
        <div class="ib" data-act="prev" style="${prevOk() ? '' : 'opacity:.35'}">${I('play-skip-back')}</div>
        <div class="tn js-pos" style="margin:0 6px">0:00</div>
        ${seekBar()}
        <div class="tn js-dur" style="margin:0 6px">0:00</div>
        <div class="ib" data-act="next" style="${nextOk() ? '' : 'opacity:.35'}">${I('play-skip-forward')}</div>
        <div class="sep"></div>
        <div class="ib${st.panel === 'subs' ? ' on' : ''}" data-act="open" data-p="subs">${I('text-outline')}</div>
        <div class="ib${st.panel === 'episodes' ? ' on' : ''}" data-act="open" data-p="episodes">${I('albums-outline')}</div>
        <div class="ib${st.panel === 'card' ? ' on' : ''}" data-act="open" data-p="card">${I(st.panel === 'card' ? 'settings' : 'settings-outline')}</div>
        <div class="ib" data-act="full">${I(document.fullscreenElement ? 'contract-outline' : 'expand-outline')}</div>
      </div>`;
    return `<div class="vd">${controls}${skipChip('red')}${panel}</div>`;
  }

  function renderF() {
    const panel = st.panel === 'av' ? (st.sub === 'translate' ? translatePanel() : avPanel())
      : st.panel === 'menu' ? menuPop() : st.panel === 'episodes' ? strip() : '';
    const controls = !st.controls || st.panel === 'episodes' ? '' : `
      <div class="vd">
        <div class="tl glass row cap">
          <div class="ib" data-act="back">${I('arrow-back')}</div>
          <div style="min-width:0">${title()}</div>
        </div>
        <div class="tr glass row cap">
          <div class="chip ghost" data-act="open" data-p="menu" data-sub="server">Server ${st.server + 1}/3</div>
          <div class="sep"></div>
          <div class="ib" data-act="lock" style="font-size:20px;padding:6px">${I('lock-open-outline')}</div>
          <div class="ib" data-act="open" data-p="menu" style="font-size:20px;padding:6px">${I('ellipsis-vertical')}</div>
        </div>
        <div class="centre">
          <div class="round glass skipbtn hit" data-act="back10">${I('reload-outline', 'mirror')}<span>10</span></div>
          <div class="wplay hit" data-act="play">${I(playIcon())}</div>
          <div class="round glass skipbtn hit" data-act="fwd10">${I('reload-outline')}<span>10</span></div>
        </div>
      </div>
      <div class="dock glass cap">
        <div class="row" style="gap:10px"><div class="tn js-pos">0:00</div>${seekBar()}<div class="tn js-dur">0:00</div></div>
        <div class="row r2">
          <div class="nav${prevOk() ? '' : ' off'}" data-act="prev">${I('chevron-back')}Ep ${st.ep}</div>
          <div class="nav" data-act="open" data-p="episodes">${I('albums-outline')}Episode ${st.ep + 1} of ${EPS.length}</div>
          <div class="nav${nextOk() ? '' : ' off'}" data-act="next">Ep ${st.ep + 2}${I('chevron-forward')}</div>
          <div class="grow"></div>
          <div class="tool" data-act="open" data-p="av">${I('chatbox-ellipses-outline')}Audio &amp; subtitles</div>
          <div class="tool" data-act="open" data-p="av">${I('speedometer-outline')}${st.speed}x</div>
          <div class="tool" data-act="full">${I(document.fullscreenElement ? 'contract-outline' : 'expand-outline')}</div>
        </div>
      </div>`;
    return `<div class="vf">${controls}${skipChip('red')}${st.upnext && !st.panel ? upNext() : ''}${panel}</div>`;
  }

  function renderG() {
    const panel = st.panel === 'av' ? (st.sub === 'translate' ? translatePanel() : avPanel())
      : st.panel === 'menu' ? menuPop() : st.panel === 'episodes' ? strip() : '';
    const controls = !st.controls || st.panel === 'episodes' ? '' : `
      <div class="grad-top"></div><div class="grad-bot"></div>
      <div class="top row">
        <div class="ib" data-act="back">${I('arrow-back')}</div>
        <div class="mid">${title()}</div><div class="grow"></div>
        <div class="chip" data-act="open" data-p="menu" data-sub="server">Server ${st.server + 1}/3</div>
        <div class="ib" data-act="lock" style="font-size:20px">${I('lock-open-outline')}</div>
        <div class="ib" data-act="open" data-p="menu" style="font-size:20px">${I('ellipsis-vertical')}</div>
      </div>
      <div class="centre">${skipBack('hit')}<div class="play hit" data-act="play">${I(playIcon())}</div>${skipFwd('hit')}</div>
      <div class="bottom">
        <div class="row" style="gap:14px"><div class="tn js-pos">0:00</div>${seekBar()}<div class="tn js-left">-0:00</div></div>
        <div class="row labels">
          <div class="lb${prevOk() ? '' : ' off'}" data-act="prev">${I('play-skip-back-outline')}Ep ${st.ep}</div>
          <div class="lb" data-act="open" data-p="episodes">${I('albums-outline')}Episodes</div>
          <div class="lb" data-act="open" data-p="av">${I('chatbox-ellipses-outline')}Audio &amp; subtitles</div>
          <div class="lb" data-act="open" data-p="av">${I('speedometer-outline')}${st.speed}x</div>
          <div class="lb${nextOk() ? '' : ' off'}" data-act="next">Ep ${st.ep + 2}${I('play-skip-forward-outline')}</div>
        </div>
      </div>`;
    return `<div class="vc vg">${controls}${skipChip('solid')}${st.upnext && !st.panel ? upNext() : ''}${panel}</div>`;
  }

  const RENDER = { c: renderC, d: renderD, f: renderF, g: renderG }[V];

  function render() {
    pic.dataset.fit = st.fit;
    stage.classList.toggle('up', st.controls && !st.locked && !st.panel);
    ui.innerHTML = st.locked ? (st.controls ? lockUI() : '') : RENDER();
    const lane = ui.querySelector('.js-lane');
    if (lane) { const on = lane.children[st.ep]; if (on) lane.scrollLeft = on.offsetLeft - 18 - 90; }
    tick(true);
  }

  // ── live readouts ──────────────────────────────────────
  let shownCue = '';
  function tick(once) {
    if (fake && !fake.paused) {
      const now = performance.now();
      fake.t = Math.min(DUR_FALLBACK, fake.t + (now - fake.last) / 1000 * (fake.rate || 1));
      fake.last = now;
      if (fake.t >= DUR_FALLBACK - 0.3 && st.ep < EPS.length - 1) goEp(st.ep + 1);
    } else if (fake) fake.last = performance.now();

    const t = dragging ? dragTo : M.t(), d = M.dur(), pct = t / d * 100;
    pic.style.setProperty('--p', (M.t() / M.dur()).toFixed(4));
    ui.querySelectorAll('.js-fill').forEach((e) => { e.style.width = `${pct}%`; });
    ui.querySelectorAll('.js-knob').forEach((e) => { e.style.left = `${pct}%`; });
    ui.querySelectorAll('.js-buf').forEach((e) => { e.style.width = `${M.buffered() * 100}%`; });
    ui.querySelectorAll('.js-pos').forEach((e) => { e.textContent = fmt(t); });
    ui.querySelectorAll('.js-dur').forEach((e) => { e.textContent = fmt(d); });
    ui.querySelectorAll('.js-left').forEach((e) => { e.textContent = e.closest('.upnext') ? Math.ceil(d - t) : `-${fmt(d - t)}`; });
    const inOp = t >= OP[0] && t < OP[1] - 2;
    ui.querySelectorAll('.js-skipop').forEach((e) => e.classList.toggle('hide', !inOp || !!st.panel));

    const line = st.subs === 'Off' ? '' : LINES[Math.floor(t / 4.5) % LINES.length];
    const shown = line && st.translate !== 'Do not translate' ? `${line} (${st.translate.slice(0, 2).toUpperCase()})` : line;
    if (shown !== shownCue) { cueEl.textContent = shown; shownCue = shown; }

    const wantUp = (V === 'f' || V === 'g') && nextOk() && !st.upnextGone && d - t < 20 && d > 30;
    if (wantUp !== st.upnext) { st.upnext = wantUp; render(); }

    const pi = ui.querySelector('[data-act="play"] ion-icon');
    if (pi && pi.getAttribute('name') !== playIcon()) pi.setAttribute('name', playIcon());
    if (!once) requestAnimationFrame(() => tick(false));
  }

  // ── actions ────────────────────────────────────────────
  function goEp(i) {
    if (i < 0 || i >= EPS.length) return;
    st.ep = i; st.panel = null; st.sub = null; st.upnext = false; st.upnextGone = false;
    M.seek(START); M.play();
    toast(`Episode ${i + 1}`);
    render();
  }

  function setVal(k, raw) {
    let v = raw;
    if (k === 'speed') { v = Number(raw); M.rate(v); toast(v === 1 ? 'Normal speed' : `${v}x`); }
    else if (k === 'server') { v = Number(raw); toast(`Server ${v + 1}`); }
    else if (k === 'fit') toast(FITS.find((f) => f[0] === v)[1]);
    else if (k === 'quality') toast(`Quality: ${v}`);
    else if (k === 'audio') toast(v === 'Japanese' ? 'Subbed' : 'Dubbed');
    else if (k === 'subs') toast(v === 'Off' ? 'Subtitles off' : `Subtitles: ${v}`);
    else if (k === 'translate') toast(v === 'Do not translate' ? 'Not translating' : `Translating to ${v}`);
    st[k] = v;
    if (k === 'subs' && v === 'Off') st.translate = 'Do not translate';
    // Menus that pick and go: C's ⋮ list and D's server list.
    if ((st.panel === 'menu' && st.sub) || (st.panel === 'card' && st.sub === 'server')) { st.sub = null; if (st.panel === 'menu') st.panel = null; }
    render();
  }

  async function full() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        try { await screen.orientation.lock('landscape'); } catch { /* not every browser can */ }
      }
    } catch { toast('Fullscreen not available'); }
    setTimeout(() => { layout(); render(); }, 300);
  }

  ui.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    e.stopPropagation();
    const act = a.dataset.act;
    bump();
    switch (act) {
      case 'play': M.paused() ? M.play() : M.pause(); setTimeout(render, 30); break;
      case 'back10': M.seek(M.t() - 10); flashSide('l', 10); break;
      case 'fwd10': M.seek(M.t() + 10); flashSide('r', 10); break;
      case 'prev': goEp(st.ep - 1); break;
      case 'next': goEp(st.ep + 1); break;
      case 'ep': goEp(Number(a.dataset.i)); break;
      case 'skipop': M.seek(OP[1]); toast('Skipped the opening'); break;
      case 'lock': st.locked = true; st.controls = false; st.panel = null; toast('Locked. Tap the screen to unlock'); render(); break;
      case 'unlock': st.locked = false; st.controls = true; render(); break;
      case 'open':
        if (st.panel === a.dataset.p && !a.dataset.sub) { st.panel = null; st.sub = null; }
        else { st.panel = a.dataset.p; st.sub = a.dataset.sub || null; }
        render(); break;
      case 'sub': st.sub = a.dataset.sub || null; render(); break;
      case 'close': st.panel = null; st.sub = null; render(); break;
      case 'set': setVal(a.dataset.k, a.dataset.val); break;
      case 'pip':
        st.panel = null;
        if (!fake && document.pictureInPictureEnabled) video.requestPictureInPicture().catch(() => toast('Picture-in-picture not available'));
        else toast('Picture-in-picture not available here');
        render(); break;
      case 'full': full(); break;
      case 'back': location.href = './'; break;
      case 'noupnext': st.upnextGone = true; st.upnext = false; render(); break;
    }
  });
  document.querySelector('.rotate button').addEventListener('click', full);

  // Taps on the picture: one shows or hides the controls, two seek a side.
  let lastTap = 0, tapT;
  $('gest').addEventListener('pointerup', (e) => {
    const now = Date.now();
    const r = stage.getBoundingClientRect();
    const side = e.clientX - r.left < r.width / 2 ? 'l' : 'r';
    if (now - lastTap < 280 && !st.locked) {
      clearTimeout(tapT); lastTap = 0;
      M.seek(M.t() + (side === 'l' ? -10 : 10)); flashSide(side, 10);
      return;
    }
    lastTap = now;
    tapT = setTimeout(() => {
      if (st.panel) { st.panel = null; st.sub = null; }
      else st.controls = !st.controls;
      if (st.controls) bump();
      render();
    }, 280);
  });
  let sideN = { l: 0, r: 0 }, sideT = {};
  function flashSide(s, n) {
    const el = $(s === 'l' ? 'rl' : 'rr');
    sideN[s] += n;
    el.querySelector('span').textContent = `${s === 'l' ? '-' : '+'}${sideN[s]}s`;
    el.classList.add('on');
    clearTimeout(sideT[s]);
    sideT[s] = setTimeout(() => { el.classList.remove('on'); sideN[s] = 0; }, 650);
  }

  // Dragging the bar: the bubble previews, the jump lands on release.
  let dragging = false, dragTo = 0, dragEl = null;
  ui.addEventListener('pointerdown', (e) => {
    const s = e.target.closest('.js-seek');
    if (!s) return;
    e.preventDefault();
    dragging = true; dragEl = s; s.classList.add('drag'); s.setPointerCapture(e.pointerId);
    moveDrag(e);
  });
  ui.addEventListener('pointermove', (e) => { if (dragging) moveDrag(e); });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false; dragEl.classList.remove('drag');
    M.seek(dragTo); bump();
  };
  ui.addEventListener('pointerup', endDrag);
  ui.addEventListener('pointercancel', endDrag);
  function moveDrag(e) {
    const r = dragEl.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    dragTo = k * M.dur();
    const b = dragEl.querySelector('.js-bubble');
    b.textContent = fmt(dragTo); b.style.left = `${k * 100}%`;
    tick(true);
  }

  // ── layout ─────────────────────────────────────────────
  function layout() {
    const framed = matchMedia('(pointer: fine)').matches && innerWidth >= 900 && innerHeight >= 460;
    document.body.classList.toggle('framed', framed || SHOT);
    document.body.classList.toggle('portrait', !framed && !SHOT && innerHeight > innerWidth);
  }
  addEventListener('resize', () => { layout(); render(); });
  document.addEventListener('fullscreenchange', () => { layout(); render(); });
  layout();
  render();
  bump();
  requestAnimationFrame(() => tick(false));
})();
