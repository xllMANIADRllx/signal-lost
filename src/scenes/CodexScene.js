// ═══════════════════════════════════════════════════════════
// CODEXSCENE
// ═══════════════════════════════════════════════════════════

class CodexScene extends Phaser.Scene{
  constructor(){super('CodexScene');}
  create(){
    try{CRT.inGame=false;}catch(e){}
    this.cameras.main.setBackgroundColor('#05100a');
    this.cameras.main.fadeIn(280,0,0,0);
    const mono="'Courier New',monospace", orb="'Orbitron',sans-serif";

    // Grid
    const g=this.add.graphics().setAlpha(0.08);
    g.lineStyle(1,0xff9944,1);
    for(let x2=0;x2<=W;x2+=80){g.moveTo(x2,0);g.lineTo(x2,H);}
    for(let y2=0;y2<=H;y2+=80){g.moveTo(0,y2);g.lineTo(W,y2);}
    g.strokePath();

    // Header
    this.add.rectangle(W/2,0,W,36,0x020f07,0.97).setOrigin(0.5,0);
    this.add.rectangle(W/2,36,W,1.5,0xff9944,0.5).setOrigin(0.5,0);
    this.add.text(W/2,17,'SIGNAL_CODEX.DAT',{fontFamily:orb,fontSize:'16px',fontStyle:'900',color:'#ff9944',letterSpacing:5}).setOrigin(0.5);
    this.add.text(20,17,'// RECOVERED MEMORY',{fontFamily:mono,fontSize:'10px',color:'#998855'}).setOrigin(0,0.5);

    // ── DATA DEFINITIONS ──
    const ENEMY_DATA=[
      // SURFACE_LAYER
      {id:'BASIC_PROC',  col:'#ff4444',colN:0xff4444, sector:'SURFACE_LAYER', wave:'1+', hp:1, spd:'120px/s', threat:'LOW',
       shape:'circle', shapeCol:0xff4444,
       desc:'Standard network process. Moves directly toward your position. No special behaviour. Becomes dangerous in volume.',
       tactics:'Single reflection kills. Prioritise chain kills over direct hits. Use SIGNAL_PULL to funnel groups.',
       lore:'"They are not hostile. They are simply following their routing table. You are not in the table."'},
      {id:'ELITE_NODE',  col:'#ffaa00',colN:0xffaa00, sector:'SURFACE_LAYER', wave:'4+', hp:3, spd:'90px/s', threat:'MED',
       shape:'hex', shapeCol:0xffaa00,
       desc:'Armoured process. Absorbs multiple reflections before terminating. Moves slower but is much harder to kill.',
       tactics:'Chain reactions most efficient. ECHO_BURST helps. Avoid letting elites stack up unchecked.',
       lore:'"It has redundant memory. You can hit it twice and it just... routes around the damage."'},
      {id:'LEECH',       col:'#44ff44',colN:0x44ff44, sector:'SURFACE_LAYER', wave:'5+', hp:1, spd:'130px/s', threat:'MED',
       shape:'worm', shapeCol:0x44ff44,
       desc:'Drains bubble heat on contact. Does not shoot. Dangerous when it reaches you.',
       tactics:'Prioritise immediately. Keep bubble small when present. Reflect early before it closes distance.',
       lore:'"It doesn\'t attack. It just sits near you. And you start to overheat for no reason."'},
      {id:'BOUNCER',     col:'#00ccff',colN:0x00ccff, sector:'SURFACE_LAYER', wave:'8+', hp:2, spd:'70px/s', threat:'HIGH',
       shape:'hex_fat', shapeCol:0x00ccff,
       desc:'Deflects reflected bullets 90° on contact. Your own shots become a hazard. Does not deflect PING.',
       tactics:'Use PING against Bouncers. If you must reflect, aim away from groups to avoid self-hits.',
       lore:'"Our own bullets. It turned our own bullets against us."'},
      {id:'PHANTOM',     col:'#cc88ff',colN:0xcc88ff, sector:'SURFACE_LAYER', wave:'10+', hp:1, spd:'180px/s', threat:'HIGH',
       shape:'ghost', shapeCol:0xcc88ff,
       desc:'Leaves an unkillable ghost decoy on death that blocks movement. Ghost expires after 4s.',
       tactics:'Kill Phantoms near screen edges so ghost decoys appear safely. GHOST.EXE skin has natural synergy.',
       lore:'"You killed it. It came back. Not the same — just the shape of it. Blocking the path."'},
      // SECTOR_00
      {id:'ORBIT.NODE',  col:'#0088ff',colN:0x0088ff, sector:'SECTOR_00', wave:'6+', hp:2, spd:'80px/s', threat:'MED',
       shape:'orbit', shapeCol:0x0088ff,
       desc:'Orbits a fixed anchor point. Fires toward player from any orbit angle. Orbit tightens when hit.',
       tactics:'Lead your shots. Hit it on the close pass. Reflected bullets curve toward it with GRAVITY_ECHO relic.',
       lore:'"It refuses to approach. Just circles. Waiting for an angle."'},
      {id:'PULSAR',      col:'#aa44ff',colN:0xaa44ff, sector:'SECTOR_00', wave:'8+', hp:3, spd:'0px/s', threat:'HIGH',
       shape:'diamond', shapeCol:0xaa44ff,
       desc:'Stationary. Every 2s emits a gravity pulse that bends nearby bullets off-course within 160px.',
       tactics:'Kill Pulsars first — they interfere with all your reflections. Max 2 per wave.',
       lore:'"It doesn\'t move. It just pulses. And every time it does, the geometry of the room shifts."'},
      {id:'DRIFT.PACKET',col:'#00aaaa',colN:0x00aaaa, sector:'SECTOR_00', wave:'6+', hp:1, spd:'280px/s', threat:'MED',
       shape:'arrow', shapeCol:0x00aaaa,
       desc:'Fires straight ahead at spawn angle — never changes direction. Fires 3-bullet burst when crossing your axis.',
       tactics:'Watch for axis-crossing bursts. Stay moving laterally. Splits into 2 smaller drifts on death.',
       lore:'"It had no target. It just kept going. Straight through whatever was in the way."'},
      // DEEP_MEMORY
      {id:'MEMORY.TRAP', col:'#ff44aa',colN:0xff44aa, sector:'DEEP_MEMORY', wave:'12+', hp:2, spd:'0px/s', threat:'HIGH',
       shape:'mine', shapeCol:0xff44aa,
       desc:'Stationary mine. Detonates on proximity (80px) or after 6s — fires 8-bullet ring. Shoot it early to detonate safely.',
       tactics:'Reflected bullets can trigger it safely from range. Watch the 80px pulse ring for warning.',
       lore:'"It was waiting. It had been waiting since before I entered this sector."'},
      {id:'FRAGMENT',    col:'#44ffcc',colN:0x44ffcc, sector:'DEEP_MEMORY', wave:'11+', hp:1, spd:'200px/s', threat:'LOW',
       shape:'shard', shapeCol:0x44ffcc,
       desc:'Spawns as a 4-shard cluster. Shards separate on hit. Last shard fires 4 bullets on death.',
       tactics:'Excellent chain reaction food. Let them spread then sweep through with a single wide reflect.',
       lore:'"Memory fragmentation. Each piece still tries to complete the original request."'},
      // KERNEL_SPACE
      {id:'CORE.SHARD',  col:'#ff2244',colN:0xff2244, sector:'KERNEL_SPACE', wave:'16+', hp:2, spd:'170px/s', threat:'HIGH',
       shape:'jagged', shapeCol:0xff2244,
       desc:'Erratic movement, changes direction every 0.6s. Splits into 2 mini-shards on death that fire once each.',
       tactics:'Lead shots carefully. Kill at screen edge to contain the death shards. Fast fire rate.',
       lore:'"The kernel is breaking apart. But each fragment still executes. Still hostile."'},
      {id:'OVERLOAD.NODE',col:'#ff8800',colN:0xff8800, sector:'KERNEL_SPACE', wave:'18+', hp:3, spd:'80px/s', threat:'HIGH',
       shape:'charger', shapeCol:0xff8800,
       desc:'Charges over 5s and fires 8-bullet ring — but only if you are within 300px. Killing it cancels the burst.',
       tactics:'Stay outside 300px to nullify or rush it down before 5s. Watch the arc lightning charge indicator.',
       lore:'"Overloaded. It can\'t contain the process any more. Neither can we."'},
    ];

    const BOSS_DATA=[
      {id:'FIREWALL',   col:'#ff2200',colN:0xff2200, wave:5,  hp:24, size:48,
       p1:'Sealed armoured octagon with bolt corners. Slow rotation.',
       p2:'Shell cracks open — exposed glowing core with energy sparks.',
       attack1:'Radial bullet rings + wall barriers in phase 2+',
       attack2:'Spinning walls + 12-bullet blasts in phase 3',
       relic:'PACKET_WALL — every 8 reflects fires a perpendicular wall of 5 bullets',
       tactics:'Reflect wall segments. Hit the exposed core between barriers in phase 2.',
       lore:'"The FIREWALL was not defending anything. It was hunting."'},
      {id:'VOID.NODE',  col:'#aa00ff',colN:0xaa00ff, wave:10, hp:20, size:44,
       p1:'Open hexagonal lattice cage with inner spar ring.',
       p2:'Cage implodes into black hole with accretion disc.',
       attack1:'Gravity wells that bend your bullets off-course',
       attack2:'Inward pull streaks + rapid aimed fire',
       relic:'GRAVITY_ECHO — your reflected bullets curve toward nearest enemy',
       tactics:'Aim between gravity wells. GRAVITY_ECHO relic turns the wells into an advantage.',
       lore:'"VOID.NODE consumed its own sector. 400 terabytes — erased. Deliberately."'},
      {id:'GHOST.EXE',  col:'#00ff88',colN:0x00ff88, wave:15, hp:28, size:50,
       p1:'Clean hexagon with circuit grid lines and node dots.',
       p2:'Hex shatters — 5 shards orbit the core, gaps between them.',
       attack1:'Spiral movement + spiral shots',
       attack2:'Fire through gaps between orbiting shards',
       relic:'PHASE_CLONE — dashing releases 8-bullet burst from dash origin after 1s',
       tactics:'Shoot through shard gaps in phase 2. The real body is the small core.',
       lore:'"GHOST.EXE was once a guardian. It watched for 14 years before going silent."'},
      {id:'CORE.BREACH',col:'#ffd700',colN:0xffd700, wave:20, hp:35, size:54,
       p1:'Reactor with three containment rings and cardinal spars.',
       p2:'Rings shatter — six jagged energy spikes erupt outward.',
       attack1:'Ring burst fire through containment breaks',
       attack2:'Six pulsing energy spikes + full bullet storm',
       relic:'BREACH_PULSE — overheat emits 12-bullet ring outward',
       tactics:'Destroy phase 2 spike gaps to open windows. BREACH_PULSE turns overheat into offense.',
       lore:'"I found the original routing table. SECTOR 00 predates the architecture by decades."'},
    ];

    const RELIC_DATA=[
      {id:'PACKET_WALL',  col:'#ff4400',colN:0xff4400, source:'FIREWALL',
       effect:'Every 8th reflect fires 5 bullets perpendicular to the last reflection direction.',
       synergy:'Stack with ECHO_BURST and SIGNAL_FORK for massive perpendicular coverage.',
       lore:'"The wall remembered the shape of every bullet that passed through it."'},
      {id:'GRAVITY_ECHO', col:'#aa44ff',colN:0xaa44ff, source:'VOID.NODE',
       effect:'All reflected bullets slowly curve toward the nearest enemy within 300px.',
       synergy:'Makes PULSAR gravity wells irrelevant — your bullets home back to targets.',
       lore:'"The void does not forget what entered it. Neither do the bullets."'},
      {id:'PHASE_CLONE',  col:'#ddddff',colN:0xddddff, source:'GHOST.EXE',
       effect:'1 second after dashing, 8 bullets burst outward from your dash origin.',
       synergy:'PHANTOM skin + PHASE_CLONE = dash for decoy AND burst. Maximum chaos.',
       lore:'"You left something behind. It remembered what it was supposed to do."'},
      {id:'BREACH_PULSE', col:'#ffd700',colN:0xffd700, source:'CORE.BREACH',
       effect:'Every time you overheat, a ring of 12 bullets fires outward from your position.',
       synergy:'Pairs with INFERNO skin rage — overheat intentionally to weaponise it.',
       lore:'"The breach was always a weapon. We just did not know it yet."'},
    ];

    const ARCHETYPE_DATA=ARCHETYPES.map(a=>({
      id:a.id.toUpperCase(), col:'#'+a.col.toString(16).padStart(6,'0'), colN:a.col,
      icon:a.icon, name:a.name,
      tagline:a.tagline, desc:a.desc, passive:a.passive,
      power:(a.power||'ping').toUpperCase().replace(/_/g,' '),
      seeds:Object.entries(a.seeds||{}).map(([k,v])=>k.toUpperCase().replace(/_/g,' ')+' T'+v).join(' · '),
    }));

    const SECTOR_DATA=[
      {id:'SURFACE_LAYER', col:'#00ff66',colN:0x00ff66, waves:'1–5',  boss:'FIREWALL',
       desc:'Entry point. Standard grunts and snipers. The network\'s first line of response.',
       enemies:'BASIC_PROC, ELITE_NODE, LEECH, BOUNCER, PHANTOM',
       modifier:'Wave modifiers begin wave 3. Overclock available every 3 waves.',
       lore:'"You were not supposed to survive. The network discarded you."'},
      {id:'SECTOR_00',     col:'#0088ff',colN:0x0088ff, waves:'6–10', boss:'VOID.NODE',
       desc:'Gravity manipulation zone. Bullets do not travel straight here. New enemies phase in.',
       enemies:'All Surface Layer + ORBIT.NODE (w6), DRIFT.PACKET (w6), PULSAR (w8)',
       modifier:'VOID.NODE gravity wells influence bullet paths in final waves.',
       lore:'"SECTOR 00 exists. It predates the current architecture by decades. It was hidden."'},
      {id:'DEEP_MEMORY',   col:'#8844ff',colN:0x8844ff, waves:'11–15',boss:'GHOST.EXE',
       desc:'Corrupted memory space. Enemies leave traps and fragments. Nothing stays dead cleanly.',
       enemies:'MEMORY.TRAP (w12, from death), FRAGMENT (w11)',
       modifier:'Ghost echo visual effects. Phantom count increases.',
       lore:'"GHOST.EXE was once a guardian. It watched for 14 years before going wrong."'},
      {id:'KERNEL_SPACE',  col:'#ffd700',colN:0xffd700, waves:'16–20',boss:'CORE.BREACH',
       desc:'Raw kernel layer. Enemies are hardened, explosive, erratic. Hardest standard sector.',
       enemies:'CORE.SHARD (w16), OVERLOAD.NODE (w18). Base enemy rate drops to 30%.',
       modifier:'All previous modifiers available. OVERCLOCK now triggers every 2 waves.',
       lore:'"I found the original routing table. Before the network chose what it would become."'},
      {id:'VOID',          col:'#ff4444',colN:0xff4444, waves:'21+',  boss:'CYCLES',
       desc:'Endless mode. Bosses cycle every 5 waves at increased HP. Score multipliers compound.',
       enemies:'All types. Sector 00 enemies return at wave 26+. Spawn rates increase.',
       modifier:'Modifiers stack. Wave 30+ can have two active simultaneously.',
       lore:'"SECTOR 00 is not a place. It is a moment. Before the network chose what it would become."'},
    ];

    const MUTATION_DATA=ENEMY_MUTATIONS.map(m=>({
      id:m.label, col:'#'+m.col.toString(16).padStart(6,'0'), colN:m.col,
      desc:m.desc,
      detail:({
        splitting:'On death spawns 2 SWARM-type enemies. Chain them immediately.',
        magnetic:'Pulls reflected bullets toward it — your reflections curve away. Use GRAVITY_ECHO to counter.',
        armored:'+1 HP. Requires an extra hit. Reflected bullets that miss waste chain potential.',
        volatile:'Explodes on death dealing AoE heat damage. Kill from range or with PING.',
        phase:'Teleports when hit below 50% HP. Track where it reappears. Second hit window is brief.',
        mirror:'Deflects reflected bullets back toward you. Use PING instead.',
        regenerating:'Slowly heals if not hit for 3s. Keep pressure up. Never let it rest.',
        overclocked:'+50% speed and fire rate. Treat like a sniper-speed grunt.',
      })[m.id]||m.desc,
    }));

    const LORE_DATA=LORE.map(l=>({
      id:l.title, col:'#ff9944', colN:0xff9944,
      boss:l.boss, text:l.text,
      unlocked:Save.get('lore_unlocked')||'[]',
    }));

    // ── Tab definitions ──
    const TABS=[
      {id:'enemies',    label:'ENEMIES',    col:'#ff4444', colN:0xff4444, data:ENEMY_DATA,   groups:[{label:'// SURFACE_LAYER',filter:e=>e.sector==='SURFACE_LAYER'},{label:'// SECTOR_00',filter:e=>e.sector==='SECTOR_00'},{label:'// DEEP_MEMORY',filter:e=>e.sector==='DEEP_MEMORY'},{label:'// KERNEL_SPACE',filter:e=>e.sector==='KERNEL_SPACE'}]},
      {id:'bosses',     label:'BOSSES',     col:'#ff6600', colN:0xff6600, data:BOSS_DATA,    groups:[{label:'// WAVE BOSSES',filter:()=>true}]},
      {id:'relics',     label:'RELICS',     col:'#aa44ff', colN:0xaa44ff, data:RELIC_DATA,   groups:[{label:'// BOSS DROPS',filter:()=>true}]},
      {id:'archetypes', label:'ARCHETYPES', col:'#00ffcc', colN:0x00ffcc, data:ARCHETYPE_DATA,groups:[{label:'// PLAYSTYLES',filter:()=>true}]},
      {id:'sectors',    label:'SECTORS',    col:'#00ff66', colN:0x00ff66, data:SECTOR_DATA,  groups:[{label:'// NETWORK MAP',filter:()=>true}]},
      {id:'mutations',  label:'MUTATIONS',  col:'#ffdd00', colN:0xffdd00, data:MUTATION_DATA,groups:[{label:'// MODIFIERS',filter:()=>true}]},
      {id:'lore',       label:'LORE',       col:'#ff9944', colN:0xff9944, data:LORE_DATA,    groups:[{label:'// PACKET LOGS',filter:()=>true}]},
    ];

    const TAB_W=Math.floor(W/TABS.length);
    const TABS_H=28, HEADER_H=36, NAV_W=200, CONTENT_Y=HEADER_H+TABS_H;

    // ── Draw tab bar ──
    const tabObjs={};
    TABS.forEach((tab,i)=>{
      tabObjs[tab.id]={};
      const tx=i*TAB_W+TAB_W/2;
      const bg=this.add.rectangle(tx,HEADER_H,TAB_W,TABS_H,tab.colN,0.0).setOrigin(0.5,0).setInteractive({useHandCursor:true});
      const bar=this.add.rectangle(tx,HEADER_H,TAB_W,2,tab.colN,0.0).setOrigin(0.5,0);
      const txt=this.add.text(tx,HEADER_H+TABS_H/2,tab.label,{fontFamily:mono,fontSize:'10px',color:'#776644',letterSpacing:1}).setOrigin(0.5);
      tabObjs[tab.id]={bg,bar,txt};
      bg.on('pointerover',()=>{if(this._activeTab!==tab.id){bg.setFillStyle(tab.colN,0.08);txt.setColor(tab.col);}});
      bg.on('pointerout', ()=>{if(this._activeTab!==tab.id){bg.setFillStyle(tab.colN,0.0);txt.setColor('#776644');}});
      bg.on('pointerdown',()=>switchTab(tab.id));
    });
    this.add.rectangle(W/2,HEADER_H+TABS_H,W,1,0x443300,0.8).setOrigin(0.5,0);

    // ── NAV panel ──
    this.add.rectangle(0,CONTENT_Y,NAV_W,H-CONTENT_Y,0x040e08,0.95).setOrigin(0,0);
    this.add.rectangle(NAV_W,CONTENT_Y,1,H-CONTENT_Y,0x443300,0.8).setOrigin(0,0);

    // ── Detail panel ──
    this.add.rectangle(NAV_W+1,CONTENT_Y,W-NAV_W-1,H-CONTENT_Y,0x020a05,0.97).setOrigin(0,0);

    // ── State ──
    this._activeTab='enemies';
    this._activeEntry=null;
    this._navObjs=[];
    this._detailObjs=[];

    const clearNav=()=>{this._navObjs.forEach(o=>{try{o.destroy();}catch{}});this._navObjs=[];};
    const clearDetail=()=>{this._detailObjs.forEach(o=>{try{o.destroy();}catch{}});this._detailObjs=[];};

    // ── Draw detail for an entry ──
    const showDetail=(entry,tabId)=>{
      clearDetail();
      this._activeEntry=entry.id;
      const dadd=o=>{this._detailObjs.push(o);return o;};
      // Layout: left text column + right visual box (160px)
      const VIS_W=160, VIS_H=180;
      const DX=NAV_W+20, TEXT_W=W-NAV_W-VIS_W-40;
      const col=entry.col||'#ff9944';
      const colN=entry.colN||0xff9944;
      let dy=CONTENT_Y+16;

      // Visual box — right side, fixed position
      const VBX=W-VIS_W-10, VBY=CONTENT_Y+10;
      dadd(this.add.rectangle(VBX,VBY,VIS_W,VIS_H,0x040e08,0.97).setOrigin(0,0));
      dadd(this.add.rectangle(VBX,VBY,VIS_W,VIS_H).setStrokeStyle(1,colN,0.3).setOrigin(0,0));
      dadd(this.add.rectangle(VBX,VBY,VIS_W,2,colN,0.6).setOrigin(0,0));
      const vg=dadd(this.add.graphics());
      drawEntryVisual(vg,VBX+VIS_W/2,VBY+VIS_H/2,entry,colN);
      // Archetypes: draw the icon text on top of the circle (mirrors ArchetypeSelectScene)
      if(tabId==='archetypes'&&entry.icon){
        dadd(this.add.text(VBX+VIS_W/2,VBY+VIS_H/2,entry.icon,{
          fontFamily:"'Courier New',monospace",fontSize:'42px',color:entry.col||'#00ffcc'
        }).setOrigin(0.5));
      }
      dadd(this.add.text(VBX+VIS_W/2,VBY+VIS_H-12,'// VISUAL',{fontFamily:mono,fontSize:'8px',color:'#998855'}).setOrigin(0.5,1));

      // Title
      dadd(this.add.text(DX,dy,entry.id||entry.name,{fontFamily:mono,fontSize:'16px',fontStyle:'bold',color:col}));
      dy+=24;

      // Meta row — 2 per line to fit in text column
      const meta=[];
      if(entry.sector)meta.push({l:'SECTOR',v:entry.sector});
      if(entry.wave)meta.push({l:'WAVE',v:entry.wave});
      if(entry.hp)meta.push({l:'HP',v:String(entry.hp)});
      if(entry.spd)meta.push({l:'SPEED',v:entry.spd});
      if(entry.threat)meta.push({l:'THREAT',v:entry.threat});
      if(entry.source)meta.push({l:'SOURCE',v:entry.source});
      if(entry.waves)meta.push({l:'WAVES',v:entry.waves});
      if(entry.boss)meta.push({l:'BOSS',v:entry.boss});
      const colW=Math.floor(TEXT_W/Math.min(meta.length,3));
      meta.slice(0,3).forEach((m,mi)=>{
        const mx=DX+mi*colW;
        dadd(this.add.text(mx,dy,m.l,{fontFamily:mono,fontSize:'8px',color:'#887744'}));
        dadd(this.add.text(mx,dy+12,m.v,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:col}));
      });
      if(meta.length>3){
        meta.slice(3).forEach((m,mi)=>{
          const mx=DX+mi*colW;
          dadd(this.add.text(mx,dy+28,m.l,{fontFamily:mono,fontSize:'8px',color:'#887744'}));
          dadd(this.add.text(mx,dy+40,m.v,{fontFamily:mono,fontSize:'10px',fontStyle:'bold',color:col}));
        });
        dy+=28;
      }
      dy+=32;
      dadd(this.add.rectangle(DX,dy,TEXT_W,1,colN,0.2).setOrigin(0,0));
      dy+=10;

      // Sections
      const sections=[
        {key:'desc',     label:'// DESCRIPTION'},
        {key:'tagline',  label:'// DESCRIPTION'},
        {key:'text',     label:'// LOG'},
        {key:'tactics',  label:'// TACTICS'},
        {key:'detail',   label:'// EFFECT'},
        {key:'effect',   label:'// EFFECT'},
        {key:'attack1',  label:'// PHASE 1 ATTACK'},
        {key:'attack2',  label:'// PHASE 2 ATTACK'},
        {key:'relic',    label:'// RELIC DROP'},
        {key:'passive',  label:'// PASSIVE'},
        {key:'power',    label:'// ACTIVE POWER'},
        {key:'seeds',    label:'// STARTING UPGRADES'},
        {key:'synergy',  label:'// SYNERGY'},
        {key:'enemies',  label:'// ENEMIES'},
        {key:'modifier', label:'// MODIFIER'},
        {key:'p1',       label:'// PHASE 1'},
        {key:'p2',       label:'// PHASE 2'},
      ];
      const seen=new Set();
      sections.forEach(s=>{
        const val=entry[s.key];
        if(!val||seen.has(val))return;
        seen.add(val);
        if(dy>H-80)return;
        dadd(this.add.text(DX,dy,s.label,{fontFamily:mono,fontSize:'9px',color:'#998855',letterSpacing:2}));
        dy+=14;
        dadd(this.add.text(DX,dy,val,{fontFamily:mono,fontSize:'10px',color:'#bb9966',wordWrap:{width:TEXT_W},lineSpacing:4}));
        const lines=Math.ceil(val.length/(TEXT_W/7.5));
        dy+=Math.max(lines,1)*16+12;
      });

      // Lore
      const loreVal=entry.lore;
      if(loreVal&&dy<H-70){
        dadd(this.add.rectangle(DX,dy,TEXT_W,1,colN,0.15).setOrigin(0,0));dy+=10;
        dadd(this.add.text(DX,dy,'// LORE',{fontFamily:mono,fontSize:'9px',color:'#998855',letterSpacing:2}));dy+=14;
        dadd(this.add.text(DX,dy,loreVal,{fontFamily:mono,fontSize:'10px',color:'#997755',wordWrap:{width:TEXT_W},lineSpacing:4,fontStyle:'italic'}));
      }
    };

    // ── Draw entry visual — exact mirror of _drawEnemy + _drawBoss phase 1 ──
    const drawEntryVisual=(vg,vx,vy,entry,colN)=>{
      const sz=38, id=entry.id||'', a=0;

      // ── ENEMIES ──
      if(id==='BASIC_PROC'){
        // jagged outer ring + 6-sided inner body + crack lines
        vg.lineStyle(1,0xff3232,0.3);vg.beginPath();
        for(let s=0;s<8;s++){const pa=a+(Math.PI*2/8)*s;const jit=s%2===0?sz*1.3:sz*0.85;s===0?vg.moveTo(vx+Math.cos(pa)*jit,vy+Math.sin(pa)*jit):vg.lineTo(vx+Math.cos(pa)*jit,vy+Math.sin(pa)*jit);}
        vg.closePath();vg.strokePath();
        vg.fillStyle(0xff3232,0.85);vg.beginPath();
        for(let s=0;s<6;s++){const pa=a+(Math.PI*2/6)*s;const jit=s%2===0?sz:sz*0.7;s===0?vg.moveTo(vx+Math.cos(pa)*jit,vy+Math.sin(pa)*jit):vg.lineTo(vx+Math.cos(pa)*jit,vy+Math.sin(pa)*jit);}
        vg.closePath();vg.fillPath();
        vg.lineStyle(1,0xff0000,0.5);vg.moveTo(vx,vy);vg.lineTo(vx+Math.cos(a)*sz*0.9,vy+Math.sin(a)*sz*0.9);vg.strokePath();
        vg.fillStyle(0xff8888,0.7);vg.fillCircle(vx,vy,3);

      }else if(id==='ELITE_NODE'){
        // outer hex (thick stroke) + inner hex filled + HP arc stub
        vg.lineStyle(3,colN,0.7);vg.beginPath();
        for(let s=0;s<6;s++){const pa=a+(Math.PI/3)*s;s===0?vg.moveTo(vx+Math.cos(pa)*sz,vy+Math.sin(pa)*sz):vg.lineTo(vx+Math.cos(pa)*sz,vy+Math.sin(pa)*sz);}
        vg.closePath();vg.strokePath();
        vg.fillStyle(colN,0.75);vg.beginPath();
        for(let s=0;s<6;s++){const pa=a+(Math.PI/3)*s;s===0?vg.moveTo(vx+Math.cos(pa)*sz*0.55,vy+Math.sin(pa)*sz*0.55):vg.lineTo(vx+Math.cos(pa)*sz*0.55,vy+Math.sin(pa)*sz*0.55);}
        vg.closePath();vg.fillPath();
        vg.lineStyle(2,colN,0.9);vg.beginPath();vg.arc(vx,vy,sz+7,-Math.PI/2,-Math.PI/2+Math.PI*2);vg.strokePath();
        vg.fillStyle(0xff4444,0.9);vg.fillCircle(vx,vy,4);

      }else if(id==='LEECH'){
        // concentric circles pulsing — outer stroke + mid stroke + inner fill
        vg.lineStyle(2,colN,0.9);vg.strokeCircle(vx,vy,sz);
        vg.lineStyle(1,colN,0.4);vg.strokeCircle(vx,vy,sz*1.5);
        vg.fillStyle(colN,0.8);vg.fillCircle(vx,vy,sz*0.5);

      }else if(id==='BOUNCER'){
        // hexagonal outline (thick) + two chevrons
        vg.lineStyle(3,colN,0.8);vg.beginPath();
        for(let s=0;s<6;s++){const pa=a+(Math.PI/3)*s;s===0?vg.moveTo(vx+Math.cos(pa)*sz,vy+Math.sin(pa)*sz):vg.lineTo(vx+Math.cos(pa)*sz,vy+Math.sin(pa)*sz);}
        vg.closePath();vg.strokePath();
        vg.lineStyle(2,colN,0.8);
        vg.beginPath();vg.moveTo(vx-sz*0.5,vy+sz*0.25);vg.lineTo(vx,vy-sz*0.3);vg.lineTo(vx+sz*0.5,vy+sz*0.25);vg.strokePath();
        vg.beginPath();vg.moveTo(vx-sz*0.3,vy+sz*0.55);vg.lineTo(vx,vy);vg.lineTo(vx+sz*0.3,vy+sz*0.55);vg.strokePath();

      }else if(id==='PHANTOM'){
        // hex outline + ghost after-image ring + small core dot
        vg.lineStyle(1.5,colN,0.85);vg.beginPath();
        for(let s=0;s<6;s++){const pa=a+(Math.PI/3)*s;s===0?vg.moveTo(vx+Math.cos(pa)*sz,vy+Math.sin(pa)*sz):vg.lineTo(vx+Math.cos(pa)*sz,vy+Math.sin(pa)*sz);}
        vg.closePath();vg.strokePath();
        vg.lineStyle(1,colN,0.2);vg.strokeCircle(vx-6,vy-6,sz*0.8);
        vg.fillStyle(colN,0.7);vg.fillCircle(vx,vy,3);

      }else if(id==='ORBIT.NODE'){
        // circle stroke + inner fill + 3 orbiting dots + faint outer ring
        vg.lineStyle(1.5,colN,0.85);vg.strokeCircle(vx,vy,sz);
        vg.fillStyle(colN,0.5);vg.fillCircle(vx,vy,sz*0.45);
        for(let od=0;od<3;od++){const oa=(Math.PI*2/3)*od;vg.fillStyle(colN,0.5+od*0.15);vg.fillCircle(vx+Math.cos(oa)*(sz+6),vy+Math.sin(oa)*(sz+6),3);}
        vg.lineStyle(0.5,colN,0.2);vg.strokeCircle(vx,vy,sz+8);

      }else if(id==='PULSAR'){
        // outer diamond stroke + inner diamond fill
        const ps=sz;
        vg.lineStyle(1.5,colN,0.8);
        vg.beginPath();vg.moveTo(vx,vy-ps);vg.lineTo(vx+ps*0.7,vy);vg.lineTo(vx,vy+ps);vg.lineTo(vx-ps*0.7,vy);vg.closePath();vg.strokePath();
        vg.fillStyle(colN,0.3);
        vg.beginPath();vg.moveTo(vx,vy-ps*0.5);vg.lineTo(vx+ps*0.35,vy);vg.lineTo(vx,vy+ps*0.5);vg.lineTo(vx-ps*0.35,vy);vg.closePath();vg.fillPath();

      }else if(id==='DRIFT.PACKET'){
        // arrow pointing right + trail dots
        vg.fillStyle(colN,0.85);vg.beginPath();
        vg.moveTo(vx+sz+4,vy);
        vg.lineTo(vx+Math.cos(2.4)*sz*0.55,vy+Math.sin(2.4)*sz*0.55);
        vg.lineTo(vx-sz*0.5,vy);
        vg.lineTo(vx+Math.cos(-2.4)*sz*0.55,vy+Math.sin(-2.4)*sz*0.55);
        vg.closePath();vg.fillPath();
        vg.lineStyle(1,colN,0.3);for(let td=1;td<=3;td++){vg.strokeCircle(vx-td*8,vy,2-td*0.3);}

      }else if(id==='MEMORY.TRAP'){
        // circle fill + outer stroke + inner core + 8 spikes + outer warning ring
        vg.fillStyle(0x220011,0.95);vg.fillCircle(vx,vy,sz);
        vg.lineStyle(1.5,colN,0.85);vg.strokeCircle(vx,vy,sz);
        vg.fillStyle(0x440022,0.8);vg.fillCircle(vx,vy,sz*0.45);
        vg.lineStyle(1,colN,0.7);
        for(let sp=0;sp<8;sp++){const sa=(Math.PI/4)*sp;vg.moveTo(vx+Math.cos(sa)*(sz+2),vy+Math.sin(sa)*(sz+2));vg.lineTo(vx+Math.cos(sa)*(sz+8),vy+Math.sin(sa)*(sz+8));}
        vg.strokePath();
        vg.lineStyle(0.5,colN,0.2);vg.strokeCircle(vx,vy,sz*1.8);

      }else if(id==='FRAGMENT'){
        // 4-point rotated polygon
        const fa=0.4;
        vg.fillStyle(colN,0.8);vg.beginPath();
        for(let fp=0;fp<4;fp++){const fpa=fa+(Math.PI*2/4)*fp;const fr=sz*(0.7+0.4*(fp%2===0?1:0));fp===0?vg.moveTo(vx+Math.cos(fpa)*fr,vy+Math.sin(fpa)*fr):vg.lineTo(vx+Math.cos(fpa)*fr,vy+Math.sin(fpa)*fr);}
        vg.closePath();vg.fillPath();vg.lineStyle(1,colN,0.9);vg.strokePath();

      }else if(id==='CORE.SHARD'){
        // 12-pt jagged polygon with dark fill + colour stroke
        const ca=0.5;const cpts=[0,-1,0.5,-0.4,0.9,-0.7,0.6,0,0.9,0.6,0.4,0.3,0.2,1,-0.3,0.5,-0.9,0.7,-0.6,0,-0.8,-0.5,-0.3,-0.3];
        vg.fillStyle(0x2a0008,0.95);vg.beginPath();
        for(let pi=0;pi<cpts.length;pi+=2){const px2=cpts[pi]*sz,py2=cpts[pi+1]*sz;const rx=px2*Math.cos(ca)-py2*Math.sin(ca)+vx;const ry=px2*Math.sin(ca)+py2*Math.cos(ca)+vy;pi===0?vg.moveTo(rx,ry):vg.lineTo(rx,ry);}
        vg.closePath();vg.fillPath();vg.lineStyle(1.2,colN,0.9);vg.strokePath();

      }else if(id==='OVERLOAD.NODE'){
        // circle dark fill + coloured stroke + partial fill showing charge + 3 arc lightning
        vg.fillStyle(0x1a0400,0.95);vg.fillCircle(vx,vy,sz);
        vg.lineStyle(1.5,colN,0.7);vg.strokeCircle(vx,vy,sz);
        vg.fillStyle(colN,0.3);vg.fillCircle(vx,vy,sz*0.6);
        vg.lineStyle(1,0xffaa00,0.8);
        for(let ar=0;ar<3;ar++){const a1=(Math.PI*2/3)*ar;vg.beginPath();vg.moveTo(vx+Math.cos(a1)*sz,vy+Math.sin(a1)*sz);vg.lineTo(vx+Math.cos(a1+0.4)*(sz+6),vy+Math.sin(a1+0.4)*(sz+6));vg.lineTo(vx+Math.cos(a1+0.8)*sz,vy+Math.sin(a1+0.8)*sz);vg.strokePath();}

      // ── BOSSES (phase 1 draws — from _drawBoss new code) ──
      }else if(id==='FIREWALL'){
        // 3 concentric octagons with different opacity + gold bolt corners
        for(let ring=0;ring<3;ring++){const rs=sz*(1-ring*0.28);vg.fillStyle(colN,ring===0?0.10:ring===1?0.13:0.22);vg.beginPath();for(let s=0;s<8;s++){const ang=(Math.PI/4)*s;s===0?vg.moveTo(vx+Math.cos(ang)*rs,vy+Math.sin(ang)*rs):vg.lineTo(vx+Math.cos(ang)*rs,vy+Math.sin(ang)*rs);}vg.closePath();vg.fillPath();vg.lineStyle(ring===0?2.5:ring===1?1.5:1,colN,ring===0?0.9:ring===1?0.6:0.4);vg.beginPath();for(let s=0;s<8;s++){const ang=(Math.PI/4)*s;s===0?vg.moveTo(vx+Math.cos(ang)*rs,vy+Math.sin(ang)*rs):vg.lineTo(vx+Math.cos(ang)*rs,vy+Math.sin(ang)*rs);}vg.closePath();vg.strokePath();}
        for(let s=0;s<8;s+=2){const ang=(Math.PI/4)*s;vg.fillStyle(0xffaa00,0.8);vg.fillCircle(vx+Math.cos(ang)*sz,vy+Math.sin(ang)*sz,4);}
        vg.fillStyle(colN,0.35);vg.fillCircle(vx,vy,sz*0.18);

      }else if(id==='VOID.NODE'){
        // hexagonal lattice cage: outer hex + inner hex + spars connecting them + black core dot
        [sz,sz*0.65].forEach((lr,li)=>{vg.lineStyle(li===0?2:1.2,colN,li===0?0.85:0.5);vg.beginPath();for(let s=0;s<6;s++){const ang=(Math.PI/3)*s;s===0?vg.moveTo(vx+Math.cos(ang)*lr,vy+Math.sin(ang)*lr):vg.lineTo(vx+Math.cos(ang)*lr,vy+Math.sin(ang)*lr);}vg.closePath();vg.strokePath();});
        for(let s=0;s<6;s++){const ang=(Math.PI/3)*s;vg.lineStyle(1,colN,0.35);vg.moveTo(vx+Math.cos(ang)*sz*0.65,vy+Math.sin(ang)*sz*0.65);vg.lineTo(vx+Math.cos(ang)*sz,vy+Math.sin(ang)*sz);vg.strokePath();}
        vg.fillStyle(0x000000,0.9);vg.fillCircle(vx,vy,sz*0.18);vg.lineStyle(1.5,colN,0.7);vg.strokeCircle(vx,vy,sz*0.18);

      }else if(id==='GHOST.EXE'){
        // circuit hexagon: hex outline + circuit grid lines + node dots at intersections
        vg.fillStyle(colN,0.07);vg.beginPath();for(let s=0;s<6;s++){const ang=(Math.PI/3)*s;s===0?vg.moveTo(vx+Math.cos(ang)*sz,vy+Math.sin(ang)*sz):vg.lineTo(vx+Math.cos(ang)*sz,vy+Math.sin(ang)*sz);}vg.closePath();vg.fillPath();
        vg.lineStyle(2.5,colN,0.9);vg.beginPath();for(let s=0;s<6;s++){const ang=(Math.PI/3)*s;s===0?vg.moveTo(vx+Math.cos(ang)*sz,vy+Math.sin(ang)*sz):vg.lineTo(vx+Math.cos(ang)*sz,vy+Math.sin(ang)*sz);}vg.closePath();vg.strokePath();
        const ci=sz*0.44;vg.lineStyle(1,colN,0.4);vg.moveTo(vx-ci,vy);vg.lineTo(vx+ci,vy);vg.strokePath();vg.moveTo(vx-ci*0.5,vy-ci*0.86);vg.lineTo(vx+ci*0.5,vy+ci*0.86);vg.strokePath();vg.moveTo(vx+ci*0.5,vy-ci*0.86);vg.lineTo(vx-ci*0.5,vy+ci*0.86);vg.strokePath();
        for(let n=0;n<6;n++){const na=(Math.PI/3)*n;vg.fillStyle(colN,0.65);vg.fillCircle(vx+Math.cos(na)*sz*0.44,vy+Math.sin(na)*sz*0.44,3);}
        vg.fillStyle(colN,0.25);vg.fillCircle(vx,vy,sz*0.14);

      }else if(id==='CORE.BREACH'){
        // reactor: 3 concentric rings + cardinal connector spars + glowing core
        [sz,sz*0.74,sz*0.48].forEach((r,ri)=>{vg.lineStyle(ri===0?2.5:ri===1?1.8:1.2,colN,ri===0?0.9:ri===1?0.65:0.4);vg.strokeCircle(vx,vy,r);if(ri<2){const r2=[sz*0.74,sz*0.48][ri];for(let s=0;s<4;s++){const ang=(Math.PI/2)*s;vg.lineStyle(1.5,colN,0.45);vg.moveTo(vx+Math.cos(ang)*r,vy+Math.sin(ang)*r);vg.lineTo(vx+Math.cos(ang)*r2,vy+Math.sin(ang)*r2);vg.strokePath();}}});
        vg.fillStyle(colN,0.35);vg.fillCircle(vx,vy,sz*0.22);
        vg.fillStyle(0xffffff,0.18);vg.fillCircle(vx,vy,sz*0.1);

      }else if(entry.icon){
        // Archetype — circle fill + stroke matching ArchetypeSelectScene exactly
        vg.fillStyle(colN,0.12);vg.fillCircle(vx,vy,sz*1.2);
        vg.lineStyle(2,colN,0.7);vg.strokeCircle(vx,vy,sz*1.2);
      }else{
        vg.fillStyle(colN,0.15);vg.fillCircle(vx,vy,sz);
        vg.lineStyle(1.5,colN,0.8);vg.strokeCircle(vx,vy,sz);
        vg.fillStyle(colN,0.4);vg.fillCircle(vx,vy,sz*0.35);
      }
    };

    // ── Build nav list ──
    const buildNav=(tabId)=>{
      clearNav();
      const tab=TABS.find(t=>t.id===tabId);
      if(!tab)return;
      let ny=CONTENT_Y+6;
      tab.groups.forEach(grp=>{
        const entries=tab.data.filter(grp.filter);
        if(entries.length===0)return;
        const gh=this.add.text(10,ny,grp.label,{fontFamily:mono,fontSize:'8px',color:'#998855',letterSpacing:1});
        this._navObjs.push(gh);
        ny+=14;
        entries.forEach(entry=>{
          const isActive=this._activeEntry===entry.id;
          const col=entry.col||'#ff9944';
          const colN2=entry.colN||0xff9944;
          const rowBg=this.add.rectangle(4,ny,NAV_W-8,22,colN2,isActive?0.15:0.0).setOrigin(0,0).setInteractive({useHandCursor:true});
          const bar=this.add.rectangle(4,ny,3,22,colN2,isActive?0.9:0.4).setOrigin(0,0);
          const txt=this.add.text(14,ny+11,entry.id||entry.name,{fontFamily:mono,fontSize:'10px',color:isActive?col:'#887744'}).setOrigin(0,0.5);
          this._navObjs.push(rowBg,bar,txt);
          rowBg.on('pointerover',()=>{if(this._activeEntry!==entry.id){rowBg.setFillStyle(colN2,0.08);txt.setColor(col);}});
          rowBg.on('pointerout', ()=>{if(this._activeEntry!==entry.id){rowBg.setFillStyle(colN2,0.0);txt.setColor('#887744');}});
          rowBg.on('pointerdown',()=>{
            this._activeEntry=entry.id;
            showDetail(entry,tabId);
            buildNav(tabId);
          });
          ny+=24;
        });
        ny+=4;
      });
    };

    // ── Switch tab ──
    const switchTab=(tabId)=>{
      this._activeTab=tabId;
      this._activeEntry=null;
      clearDetail();
      // Update tab bar highlight
      TABS.forEach(t=>{
        const o=tabObjs[t.id];
        if(!o)return;
        const active=t.id===tabId;
        o.bg.setFillStyle(t.colN,active?0.12:0.0);
        o.bar.setFillStyle(t.colN,active?0.9:0.0);
        o.txt.setColor(active?t.col:'#443322');
      });
      buildNav(tabId);
      // Auto-select first entry
      const tab=TABS.find(t=>t.id===tabId);
      if(tab&&tab.data.length>0)showDetail(tab.data[0],tabId);
    };

    // Back button
    const bk=this.add.text(W-14,H/2+H*0.46,'[ BACK ]',{fontFamily:mono,fontSize:'11px',fontStyle:'bold',color:'#887744'}).setOrigin(1,0.5).setInteractive({useHandCursor:true});
    bk.on('pointerover',()=>bk.setColor('#ff9944'));
    bk.on('pointerout', ()=>bk.setColor('#887744'));
    bk.on('pointerdown',()=>{
      this.cameras.main.fadeOut(220,0,0,0);
      this.time.delayedCall(220,()=>{
        const ms=this.scene.get('MenuScene');
        if(ms&&ms.sys.isSleeping()){this.scene.wake('MenuScene');}else{this.scene.start('MenuScene');}
        this.scene.stop();
      });
    });
    this.input.keyboard&&this.input.keyboard.on('keydown-ESC',()=>bk.emit('pointerdown'));

    // Init
    switchTab('enemies');
  }
}

function getDailyChallenges(){
  // Seed RNG from today's date so challenges are same for everyone on same day
  const today=new Date();
  const seed=today.getFullYear()*10000+(today.getMonth()+1)*100+today.getDate();
  let s=seed;
  const rng=()=>{s=(s*1664525+1013904223)&0xffffffff;return(s>>>0)/0xffffffff;};

  const POOL=[
    {id:'surv_nowaves', cat:'SURVIVAL',label:'NO_SHIELD_RUN',   desc:'Complete 5 waves without ever activating your shield.',diff:'MED', reward:8},
    {id:'surv_heat',    cat:'SURVIVAL',label:'HEAT_LIMIT',      desc:'Survive 10 waves keeping bubble heat below 60% at all times.',diff:'HAR',reward:12},
    {id:'surv_nodash',  cat:'SURVIVAL',label:'STATIC_PROCESS',  desc:'Reach wave 5 without using dash.',diff:'EASY',reward:6},
    {id:'score_chain',  cat:'SCORE',   label:'CHAIN_REACTION',  desc:'Achieve a chain of 15+ in a single wave.',diff:'MED', reward:8},
    {id:'score_combo',  cat:'SCORE',   label:'COMBO_MASTER',    desc:'Maintain a combo of 20+ for 3 consecutive waves.',diff:'HAR',reward:14},
    {id:'score_10k',    cat:'SCORE',   label:'DATA_HARVEST',    desc:'Reach 10,000 signal score in a single run.',diff:'EASY',reward:6},
    {id:'skill_boss',   cat:'SKILL',   label:'BOSS_RUSH',       desc:'Defeat a boss without taking any damage.',diff:'HAR',reward:15},
    {id:'skill_reflect',cat:'SKILL',   label:'PERFECT_REFLECT', desc:'Reflect 50 bullets in a single wave.',diff:'MED', reward:8},
    {id:'skill_ping',   cat:'SKILL',   label:'PING_MASTER',     desc:'Kill 20 enemies using only PING power.',diff:'MED', reward:10},
    {id:'chaos_corrupt',cat:'CHAOS',   label:'MASS_CORRUPTION', desc:'Corrupt and defect 10 enemies in one run.',diff:'MED', reward:10},
    {id:'chaos_volatile',cat:'CHAOS',  label:'CHAIN_REACTION',  desc:'Trigger 5 volatile explosions in a single wave.',diff:'EASY',reward:6},
    {id:'chaos_surge',  cat:'CHAOS',   label:'SURGE_ADDICT',    desc:'Activate surge 8 times in a single run.',diff:'HAR',reward:12},
  ];

  // Pick 3 challenges seeded by date (no repeats)
  const shuffled=[...POOL].sort(()=>rng()-0.5);
  return shuffled.slice(0,3);
}
