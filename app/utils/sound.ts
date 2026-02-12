// Utility function to play a gentle ding sound for notifications
export function playNotificationSound() {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for the ding sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure the sound (gentle ding - 800Hz with a quick fade)
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    // Set volume envelope (quick attack, gentle decay)
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Gentle decay
    
    // Play the sound
    oscillator.start(now);
    oscillator.stop(now + 0.15); // Short duration (150ms)
    
    // Clean up
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    // Silently fail if audio context is not available
    console.debug('Could not play notification sound:', error);
  }
}

