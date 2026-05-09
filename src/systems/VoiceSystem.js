// ═══════════════════════════════════════════════════════════
// VOICE SYSTEM — Speech synthesis for AI voice lines
// ═══════════════════════════════════════════════════════════

const Voice = {
  say(text) {
    if (!Settings.get('voice') || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u     = new SpeechSynthesisUtterance(text);
    u.rate       = 0.78;
    u.pitch      = 0.15;
    u.volume     = Settings.get('voice_vol') || 0.45;
    speechSynthesis.speak(u);
  },
};
