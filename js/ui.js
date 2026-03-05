export class UIManager {
    constructor() {
        this.scoreEl = document.getElementById('score');
        this.pinsDownEl = document.getElementById('pins-down');
        this.pinsLeftEl = document.getElementById('pins-left');
        this.centerMsg = document.getElementById('center-msg');
        
        // Initialize frame elements
        this.frames = [];
        for(let i=1; i<=10; i++) {
            this.frames.push({
                t1: document.getElementById(`f${i}-t1`),
                t2: document.getElementById(`f${i}-t2`),
                t3: i === 10 ? document.getElementById(`f${i}-t3`) : null,
                score: document.getElementById(`f${i}-s`)
            });
        }
    }

    updateScore(val) {
        if(this.scoreEl) this.scoreEl.innerText = val.toString().padStart(6, '0');
    }

    updateFrame(frameIdx, t1, t2, frameTotal, t3 = "") {
        const f = this.frames[frameIdx - 1];
        if(!f) return;

        if(f.t1) f.t1.innerText = t1;
        if(f.t2) f.t2.innerText = t2;
        if(f.t3) f.t3.innerText = t3;
        // Global score is updated via updateScore()
    }

    resetSheet() {
        this.frames.forEach(f => {
            if(f.t1) f.t1.innerText = "";
            if(f.t2) f.t2.innerText = "";
            if(f.t3) f.t3.innerText = "";
        });
        this.updateScore(0);
    }

    updatePinStats(down, left) {
        if(this.pinsDownEl) this.pinsDownEl.innerText = down;
        if(this.pinsLeftEl) this.pinsLeftEl.innerText = left;
    }

    showOverlay(text) {
        this.centerMsg.innerText = text;
        this.centerMsg.style.display = 'block';
        
        // Glitch effect in DOM
        this.centerMsg.style.transform = `skew(${Math.random()*10}deg)`;
        
        setTimeout(() => {
            this.centerMsg.style.display = 'none';
        }, 2000);
    }
    
    showParams(text) {
        // Just logs to bottom message area or console in a real app
        console.log(`[SYSTEM]: ${text}`);
    }

    showError(msg) {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.top = '10px';
        div.style.left = '10px';
        div.style.color = 'red';
        div.style.background = 'black';
        div.style.zIndex = '9999';
        div.innerText = 'ERROR: ' + msg;
        document.body.appendChild(div);
        console.error(msg);
    }
}
