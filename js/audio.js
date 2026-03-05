export class AudioManager {
    constructor() {
        this.ctx = null;
        this.started = false;
        
        // Music Streaming
        this.music = new Audio();
        this.music.src = 'audio/music.mp3';
        this.music.loop = true;
        this.music.crossOrigin = "anonymous";
        this.music.volume = 0.5; // Initial volume
        
        this.masterGain = null;
        this.musicGain = null;
    }

    async init() {
        if(this.started) return;
        try {
            console.log("Initializing Audio...");
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            
            // Connect Music to AudioContext for volume control
            const source = this.ctx.createMediaElementSource(this.music);
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.music.volume;
            
            source.connect(this.musicGain);
            this.musicGain.connect(this.masterGain);

            this.started = true;
            
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            this.playDrone();
            
            console.log("Playing music...");
            const playPromise = this.music.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Music play failed:", error);
                });
            }
        } catch (e) {
            console.error("Audio initialization failed:", e);
        }
    }

    setMusicVolume(val) {
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
        } else {
            this.music.volume = val;
        }
    }

    playDrone() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 50;
        gain.gain.value = 0.015;
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        
        setInterval(() => {
            if(this.ctx && this.ctx.state === 'running') {
                osc.frequency.setValueAtTime(50 + Math.random() * 5, this.ctx.currentTime);
            }
        }, 200);
    }

    playSynth(type) {
        if(!this.started || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.ctx.currentTime;

        if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'shoot') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.linearRampToValueAtTime(880, now + 0.5);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 1.0);
            osc.start(now);
            osc.stop(now + 1.0);
        } else if (type === 'charge') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(400, now + 1.0);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 1.0);
            osc.start(now);
            osc.stop(now + 1.0);
        }
    }
}