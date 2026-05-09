// ═══ MAIN — PHASER GAME BOOTSTRAP ═══

function _applyRenderScale() {
  try {
    const s = Settings.get('render_scale') || 1;
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.imageRendering = s > 1 ? 'pixelated' : 'auto';
    }
  } catch (e) {}
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#020804',
  antialias: false,
  roundPixels: true,
  scene: [
    MenuScene, BootScene, ArchetypeSelectScene, StatsScene,
    CorruptedBriefingScene, MetaUpgradeScene, RunSummaryScene,
    GameScene, DevScene, DailyChallengeScene, OverclockScene,
    UpgradeScene, GameOverScene, BossCutsceneScene, ShopScene,
    CodexScene, SettingsScene
  ],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: {
    postBoot: () => {
      setTimeout(() => CRT.init(), 100);
      try { if (window._bootHide) window._bootHide(); } catch (e) {}
      _applyRenderScale();
      document.addEventListener('fullscreenchange', () => {
        Settings.set('fullscreen', document.fullscreenElement != null);
      });
      const hasVisited = localStorage.getItem('sl_visited');
      if (!hasVisited) {
        localStorage.setItem('sl_visited', '1');
        Settings.set('fullscreen', true);
      }
      if (Settings.get('fullscreen')) {
        try { document.documentElement.requestFullscreen().catch(() => {}); } catch {}
      }
    }
  },
});
