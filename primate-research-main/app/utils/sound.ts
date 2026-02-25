// Utility function to play a gentle ding sound for notifications
export function playNotificationSound() {
  try {
    // Create audio context (resume if suspended - browsers require user interaction first)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    
    // Resume audio context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch((err) => {
        console.warn('Could not resume audio context:', err);
        return;
      });
    }
    
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
    
    console.log('Notification sound played');
  } catch (error) {
    // Log error for debugging
    console.error('Could not play notification sound:', error);
  }
}

