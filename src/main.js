// ═══════════════════════════════════════════════════════════
// MAIN — Phaser game bootstrap
// ═══════════════════════════════════════════════════════════

new Phaser.Game({
  type:            Phaser.AUTO,
  width:           W,
  height:          H,
  backgroundColor: '#020804',
  antialias:       false,
  roundPixels:     true,
  scene: [
    MenuScene,
    BootScene,
    ArchetypeSelectScene,
    StatsScene,
    CorruptedBriefingScene,
    MetaUpgradeScene,
    RunSummaryScene,
    GameScene,
    DevScene,
    DailyChallengeScene,
    OverclockScene,
    UpgradeScene,
    GameOverScene,
    BossCutsceneScene,
    ShopScene,
    CodexScene,
    SettingsScene,
  ],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  callbacks: {
    postBoot: () => {
      // Retina-aware CRT init
      CRT.init();

      try { if (window._bootHide) window._bootHide(); } catch {}

      // Fullscreen handling
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
    },
  },
});
