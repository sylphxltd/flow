#!/usr/bin/env node
/**
 * Audio Player Test Utility
 * Test cross-platform audio playback capabilities
 */

import { detectAudioPlayer, getAudioPlayerInfo, playNotificationSound, SYSTEM_SOUNDS, getDefaultSystemSound } from './audio-player.js';

async function testAudioPlayer() {
  console.log('🔊 Testing Cross-Platform Audio Player\n');
  console.log('━'.repeat(50));

  // Get player info
  const info = await getAudioPlayerInfo();
  console.log('\n📊 System Information:');
  console.log(`   Platform: ${info.platform}`);
  console.log(`   Audio Player Available: ${info.available ? '✅' : '❌'}`);
  console.log(`   Detected Player: ${info.player || 'None'}`);

  if (!info.available) {
    console.log('\n❌ No audio player available on this system');
    console.log('   Install one of the following:');
    if (info.platform === 'darwin') {
      console.log('   - afplay (built-in on macOS)');
    } else if (info.platform === 'linux') {
      console.log('   - mpg123: sudo apt-get install mpg123');
      console.log('   - mpg321: sudo apt-get install mpg321');
      console.log('   - sox: sudo apt-get install sox');
    } else if (info.platform === 'win32') {
      console.log('   - PowerShell (built-in)');
      console.log('   - cmdmp3');
    }
    process.exit(1);
  }

  // Get default system sound
  const defaultSound = getDefaultSystemSound();
  console.log('\n🎵 Default System Sound:');
  console.log(`   ${defaultSound || 'None available'}`);

  // List available system sounds
  console.log('\n🎼 Available System Sounds:');
  const platformSounds = SYSTEM_SOUNDS[info.platform as keyof typeof SYSTEM_SOUNDS];
  if (platformSounds) {
    Object.entries(platformSounds).forEach(([name, path]) => {
      console.log(`   ${name}: ${path}`);
    });
  } else {
    console.log('   No predefined sounds for this platform');
  }

  // Test playback
  console.log('\n▶️  Testing Playback...');
  console.log('   Playing notification sound...');

  try {
    await playNotificationSound();
    console.log('   ✅ Playback successful!');
  } catch (error) {
    console.error('   ❌ Playback failed:', error);
    process.exit(1);
  }

  console.log('\n━'.repeat(50));
  console.log('✨ Audio player test complete!\n');
}

testAudioPlayer().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
