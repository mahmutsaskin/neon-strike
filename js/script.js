  if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js')
      .then(registration => console.log('ServiceWorker kaydedildi:', registration.scope))
      .catch(err => console.log('ServiceWorker hatası:', err));
  });
}
  const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        let width, height;

        // --- YEREL KAYITLAR ---
        let savedNickname = localStorage.getItem('neonStrike_nickname') || '';
        
        let highScores = { easy: 0, normal: 0, hard: 0 };
        try { Object.assign(highScores, JSON.parse(localStorage.getItem('neonStrike_highScores'))); } catch(e) {}
        
        let currentDifficulty = 'normal';
        
        let totalPoints = parseInt(localStorage.getItem('neonStrike_totalPoints')) || 0;
        
        let unlockedShips = [0, 1, 2];
        try { let parsed = JSON.parse(localStorage.getItem('neonStrike_unlockedShips')); if (Array.isArray(parsed)) unlockedShips = parsed; } catch(e) {}
        
        let upgrades = { armor: 0, drone: 0 };
        try { Object.assign(upgrades, JSON.parse(localStorage.getItem('neonStrike_upgrades'))); } catch(e) {}
        
        let gameSettings = { music: true, sfx: true, screenShake: true, damageNumbers: true, crt: false, cursorColor: '#00ffff' };
        try { Object.assign(gameSettings, JSON.parse(localStorage.getItem('neonStrike_settings'))); } catch(e) {}

        // --- VERİ TABANLARI (Fiyatlar Eski Puan Sistemine Göre Ayarlandı) ---
        const shipsData = [
            { id: 0, price: 0, desc: "Striker MK-I (Dengeli)", hp: 100, speed: 6.0, fireRate: 120, dashCd: 60, weapon: 1 },
            { id: 1, price: 0, desc: "Twin-Fang (Hızlı)", hp: 80, speed: 7.5, fireRate: 100, dashCd: 50, weapon: 1 },
            { id: 2, price: 0, desc: "Bulwark (Tank)", hp: 150, speed: 4.5, fireRate: 140, dashCd: 80, weapon: 1 },
            { id: 3, price: 10000, desc: "Ru-Donk(Suikastçi)", hp: 90, speed: 8.5, fireRate: 90, dashCd: 40, weapon: 1 },
            { id: 4, price: 25000, desc: "Valkyrie (Taarruz)", hp: 120, speed: 7.0, fireRate: 80, dashCd: 55, weapon: 1 }, 
            { id: 5, price: 50000, desc: "Phantom Core (Ağır Silah)", hp: 180, speed: 6.5, fireRate: 65, dashCd: 45, weapon: 1 }, 
            { id: 6, price: 100000, desc: "OMEGA Leviathan", hp: 200, speed: 9.0, fireRate: 50, dashCd: 30, weapon: 2 } 
        ];
        let selectedShip = parseInt(localStorage.getItem('neonStrike_ship')) || 0;

        const themesData = [
            { id: 0, name: "NEON GRID", bg: "rgba(2, 2, 4, 0.3)", solidBg: "#020204", uiColor: "#00ffff", uiBg: "rgba(0, 255, 255, 0.1)" },
            { id: 1, name: "DEEP SPACE", bg: "rgba(5, 0, 15, 0.3)", solidBg: "#05000f", uiColor: "#aa00ff", uiBg: "rgba(170, 0, 255, 0.1)" },
            { id: 2, name: "MATRIX", bg: "rgba(0, 5, 0, 0.3)", solidBg: "#000500", uiColor: "#00ff55", uiBg: "rgba(0, 255, 85, 0.1)" },
            { id: 3, name: "HEX HIVE", bg: "rgba(15, 5, 0, 0.3)", solidBg: "#0f0500", uiColor: "#ffaa00", uiBg: "rgba(255, 170, 0, 0.1)" }
        ];
        let selectedTheme = parseInt(localStorage.getItem('neonStrike_theme')) || 0;

        const upgradeData = {
            armor: { name: "ZIRH KAPLAMASI", desc: "Maksimum Canı kalıcı olarak %10 artırır.", max: 5, basePrice: 2000 },
            drone: { name: "YARDIMCI DRON", desc: "Yanınızda gezen ve ateş eden bir dron açar.", max: 3, basePrice: 10000 }
        };

        const diffSettings = {
            easy: { spawnRate: 1.5, speedMult: 0.7, hpMult: 0.7, dmgMult: 0.5, scoreMult: 0.5 },
            normal: { spawnRate: 1.0, speedMult: 1.0, hpMult: 1.0, dmgMult: 1.0, scoreMult: 1.0 },
            hard: { spawnRate: 0.7, speedMult: 1.4, hpMult: 1.5, dmgMult: 1.5, scoreMult: 1.5 }
        };

        // --- UI ELEMENTLERİ ---
        const ui = {
            start: document.getElementById('startScreen'),
            gameOver: document.getElementById('gameOverScreen'),
            pause: document.getElementById('pauseScreen'),
            upgrade: document.getElementById('upgradeScreen'),
            settings: document.getElementById('settingsScreen'),
            nicknameInput: document.getElementById('nicknameInput'),
            diffBtns: document.querySelectorAll('.diff-btn'),
            playerNameDisplay: document.getElementById('playerNameDisplay'),
            difficultyDisplay: document.getElementById('difficultyDisplay'),
            score: document.getElementById('scoreDisplay'),
            highScore: document.getElementById('highScoreDisplay'),
            finalScore: document.getElementById('finalScore'),
            newHighScoreLabel: document.getElementById('newHighScoreLabel'),
            health: document.getElementById('healthFill'),
            healthText: document.getElementById('healthText'),
            combo: document.getElementById('comboDisplay'),
            shield: document.getElementById('shieldIndicator'),
            mobile: document.getElementById('mobileControls'),
            totalPointsDisplay: document.getElementById('totalPointsUI'),
            totalPointsDisplayUpg: document.getElementById('totalPointsUI_Upgrades'),
            crtOverlay: document.getElementById('crtOverlay')
        };

        ui.nicknameInput.value = savedNickname;
        ui.highScore.textContent = `HI: ${highScores.normal}`;
        ui.totalPointsDisplay.textContent = `TOPLAM PUAN: ${totalPoints}`;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
        if(isMobile) {
            ui.mobile.style.display = 'flex';
        }

        // --- SES MOTORU ---
        const Audio = {
            ctx: null, masterGain: null, bgMusic: null,
            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                    this.masterGain = this.ctx.createGain(); this.masterGain.gain.value = 0.25; this.masterGain.connect(this.ctx.destination);
                }
                if (this.ctx.state === 'suspended') this.ctx.resume();
                
                if (!this.bgMusic) {
                    this.bgMusic = new window.Audio('Chrome_Horizon_Pursuit.mp3');
                    this.bgMusic.loop = true;
                    this.bgMusic.volume = 0.4;
                }
            },
            playTone(freq, type, duration, vol=1, slideTo=null) {
                if (!this.ctx || !gameSettings.sfx) return; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
                osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
                gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
                osc.connect(gain); gain.connect(this.masterGain); osc.start(); osc.stop(this.ctx.currentTime + duration);
            },
            playNoise(duration, vol=1) {
                if (!this.ctx || !gameSettings.sfx) return; const bufferSize = this.ctx.sampleRate * duration; const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                const noise = this.ctx.createBufferSource(); noise.buffer = buffer; const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1000;
                gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
                noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain); noise.start();
            },
            shoot() { this.playTone(400, 'square', 0.1, 0.15, 200); },
            hit() { this.playTone(200, 'sawtooth', 0.1, 0.2, 50); },
            explosion() { this.playNoise(0.4, 0.5); this.playTone(60, 'sawtooth', 0.4, 0.4, 10); },
            powerup() { this.playTone(600, 'sine', 0.1, 0.3); setTimeout(() => this.playTone(900, 'sine', 0.2, 0.3), 100); },
            dash() { this.playNoise(0.2, 0.2); this.playTone(300, 'triangle', 0.2, 0.2, 1000); },
            startMusic() { 
                if (!gameSettings.music || !this.bgMusic) return;
                this.bgMusic.play().catch(e => console.log("Otomatik oynatma engellendi:", e)); 
            },
            stopMusic() { 
                if (this.bgMusic) this.bgMusic.pause(); 
            }
        };

        // --- ÇİZİM MOTORU ---
        function drawShipModel(ctx, id, time, thrust, isShooting) {
            ctx.lineWidth = 2; ctx.fillStyle = '#000';
            switch(id) {
                case 0:
                    ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.strokeStyle = '#fff';
                    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-12, 12); ctx.lineTo(-8, 0); ctx.lineTo(-12, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
                    if(thrust) { ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-10 - thrust, 0); ctx.strokeStyle='#00ffff'; ctx.stroke(); }
                    break;
                case 1:
                    ctx.shadowBlur = 15; ctx.shadowColor = '#00ff00'; ctx.strokeStyle = '#fff';
                    ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(0, 2); ctx.lineTo(15, -8); ctx.lineTo(-10, -12); ctx.lineTo(-5, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
                    if(thrust) { ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-5 - thrust, 0); ctx.strokeStyle='#00ff00'; ctx.stroke(); }
                    break;
                case 2:
                    ctx.shadowBlur = 15; ctx.shadowColor = '#ffcc00'; ctx.strokeStyle = '#fff';
                    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, 14); ctx.lineTo(-12, 10); ctx.lineTo(-12, -10); ctx.lineTo(6, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
                    if(thrust) { ctx.strokeStyle='#ffcc00'; ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(-12 - thrust*0.8, 5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(-12 - thrust*0.8, -5); ctx.stroke(); }
                    break;
                case 3:
                    ctx.shadowBlur = 15; ctx.shadowColor = '#aa00ff'; ctx.strokeStyle = '#fff';
                    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, 15); ctx.lineTo(-6, 0); ctx.lineTo(-12, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-5, 5); ctx.lineTo(-5, -5); ctx.closePath(); ctx.stroke();
                    if(thrust) { ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-6 - thrust*1.2, 0); ctx.strokeStyle='#aa00ff'; ctx.stroke(); }
                    break;
                case 4:
                    ctx.shadowBlur = 15; ctx.shadowColor = '#00aaff'; ctx.strokeStyle = '#fff';
                    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, 6); ctx.lineTo(-10, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
                    let wingOffset = isShooting ? 6 : 3;
                    ctx.beginPath(); ctx.moveTo(5, wingOffset); ctx.lineTo(-15, wingOffset+12); ctx.lineTo(-8, wingOffset); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(5, -wingOffset); ctx.lineTo(-15, -wingOffset-12); ctx.lineTo(-8, -wingOffset); ctx.stroke();
                    if(thrust) { ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-10 - thrust, 0); ctx.strokeStyle='#00aaff'; ctx.stroke(); }
                    break;
                case 5:
                    ctx.shadowBlur = 20; ctx.shadowColor = '#ff0055'; ctx.strokeStyle = '#fff';
                    const pulse = Math.sin(time/150)*3;
                    ctx.beginPath(); ctx.arc(0, 0, 5 + pulse/2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(12+pulse, 0); ctx.lineTo(2+pulse, 12); ctx.lineTo(2+pulse, -12); ctx.closePath(); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-10-pulse, 8); ctx.lineTo(-2-pulse, 0); ctx.lineTo(-10-pulse, -8); ctx.stroke();
                    if(thrust) { ctx.beginPath(); ctx.moveTo(-2-pulse, 0); ctx.lineTo(-2-pulse - thrust, 0); ctx.strokeStyle='#ff0055'; ctx.stroke(); }
                    break;
                case 6:
                    const hue = (time / 10) % 360;
                    ctx.shadowBlur = 25; ctx.shadowColor = `hsl(${hue}, 100%, 50%)`; ctx.strokeStyle = '#fff';
                    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-5, 15); ctx.lineTo(-15, 0); ctx.lineTo(-5, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
                    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
                    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-5, 8); ctx.lineTo(-5, -8); ctx.closePath(); ctx.stroke();
                    const float = Math.sin(time/100)*2;
                    ctx.beginPath(); ctx.moveTo(5, 18+float); ctx.lineTo(-15, 18+float); ctx.stroke(); ctx.beginPath(); ctx.moveTo(5, -18-float); ctx.lineTo(-15, -18-float); ctx.stroke();
                    if(thrust) { ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-15 - thrust*1.5, 0); ctx.lineWidth=3; ctx.stroke(); }
                    break;
            }
        }

        // --- MENÜ RENDER METOTLARI ---
        function renderShipUI(justBoughtId = null) {
            const list = document.getElementById('shipList'); list.innerHTML = '';
            shipsData.forEach(ship => {
                const isUnlocked = unlockedShips.includes(ship.id);
                const canAfford = totalPoints >= ship.price;
                const div = document.createElement('div');
                
                let classNames = `ship-item ${isUnlocked ? '' : 'locked'} ${selectedShip === ship.id ? 'active' : ''}`;
                if (!isUnlocked) classNames += canAfford ? ' affordable' : ' unaffordable';
                if (ship.id === justBoughtId) classNames += ' purchased-anim';
                
                div.className = classNames;
                div.title = `${ship.desc}\nCan: ${ship.hp} | Hız: ${ship.speed}`;
                
                if(isUnlocked) {
                    div.innerHTML = `<canvas class="ship-icon-canvas" width="45" height="45" id="ship-canvas-${ship.id}"></canvas>`;
                    div.onclick = () => { selectedShip = ship.id; localStorage.setItem('neonStrike_ship', ship.id); renderShipUI(); };
                } else {
                    let priceText = ship.price >= 1000 ? (ship.price/1000)+'K' : ship.price;
                    div.innerHTML = `
                        <canvas class="ship-icon-canvas" width="45" height="45" id="ship-canvas-${ship.id}"></canvas>
                        <div class="ship-req">💰 ${priceText}</div>
                        <div class="buy-text">${canAfford ? 'SATIN AL' : 'YETERSİZ'}</div>
                    `;
                    div.onclick = () => {
                        if (canAfford) {
                            totalPoints -= ship.price; unlockedShips.push(ship.id); selectedShip = ship.id;
                            localStorage.setItem('neonStrike_totalPoints', totalPoints); localStorage.setItem('neonStrike_unlockedShips', JSON.stringify(unlockedShips)); localStorage.setItem('neonStrike_ship', ship.id);
                            Audio.powerup(); ui.totalPointsDisplay.textContent = `TOPLAM PUAN: ${totalPoints}`; 
                            renderShipUI(ship.id); 
                            renderUpgradeUI();
                        } else {
                            Audio.hit(); 
                            div.style.transform = 'translateX(-5px) translateY(2px)'; 
                            div.style.borderColor = '#ff0055';
                            div.style.background = 'rgba(255, 0, 85, 0.2)';
                            
                            const buyTextEl = div.querySelector('.buy-text');
                            const iconEl = div.querySelector('.ship-icon-canvas');
                            const reqEl = div.querySelector('.ship-req');
                            
                            if (buyTextEl) {
                                buyTextEl.innerHTML = 'PUAN<br>YETERSİZ';
                                buyTextEl.style.opacity = '1';
                                buyTextEl.style.color = '#ff0055';
                                buyTextEl.style.textShadow = '0 0 10px #ff0055';
                                if (iconEl) iconEl.style.opacity = '0.1';
                                if (reqEl) reqEl.style.opacity = '0.1';
                            }
                            
                            ui.totalPointsDisplay.style.color = '#ff0055';
                            ui.totalPointsDisplay.style.borderColor = '#ff0055';
                            ui.totalPointsDisplay.style.textShadow = '0 0 15px #ff0055';

                            setTimeout(() => { div.style.transform = 'translateX(5px) translateY(-2px)'; }, 50); 
                            setTimeout(() => { 
                                div.style.transform = ''; 
                                div.style.borderColor = ''; 
                                div.style.background = '';
                                
                                if (buyTextEl) {
                                    buyTextEl.textContent = 'YETERSİZ';
                                    buyTextEl.style.opacity = '';
                                    buyTextEl.style.color = '';
                                    buyTextEl.style.textShadow = '';
                                    if (iconEl) iconEl.style.opacity = '';
                                    if (reqEl) reqEl.style.opacity = '';
                                }
                                
                                ui.totalPointsDisplay.style.color = '';
                                ui.totalPointsDisplay.style.borderColor = '';
                                ui.totalPointsDisplay.style.textShadow = '';
                            }, 1000);
                        }
                    };
                }
                list.appendChild(div);
            });
        }
        
        function renderThemeUI() {
            const list = document.getElementById('themeList'); list.innerHTML = '';
            themesData.forEach(t => {
                const div = document.createElement('div'); div.className = 'theme-item';
                if (selectedTheme === t.id) { div.style.borderColor = t.uiColor; div.style.boxShadow = `0 0 15px ${t.uiBg.replace('0.1', '0.4')}`; }
                div.innerHTML = `<canvas class="theme-canvas" width="90" height="60" id="theme-canvas-${t.id}"></canvas><div class="theme-label" style="color: ${selectedTheme === t.id ? t.uiColor : '#888'}">${t.name}</div>`;
                div.onclick = () => { selectedTheme = t.id; localStorage.setItem('neonStrike_theme', t.id); renderThemeUI(); };
                list.appendChild(div);
            });
        }

        function renderUpgradeUI() {
            ui.totalPointsDisplayUpg.textContent = `TOPLAM PUAN: ${totalPoints}`;
            const list = document.getElementById('upgradeList'); list.innerHTML = '';
            
            for(let key in upgradeData) {
                let upg = upgradeData[key];
                let currentLvl = upgrades[key] || 0;
                let price = upg.basePrice * (currentLvl + 1);
                let isMax = currentLvl >= upg.max;
                
                const div = document.createElement('div');
                div.className = 'upgrade-item';
                div.innerHTML = `
                    <div class="upg-info">
                        <div class="upg-title">${upg.name}</div>
                        <div class="upg-desc">${upg.desc}</div>
                        <div class="upg-level">SEVİYE: ${currentLvl} / ${upg.max}</div>
                    </div>
                    <button class="upg-btn" ${isMax || totalPoints < price ? 'disabled' : ''}>
                        ${isMax ? 'MAX' : '💰 ' + price}
                    </button>
                `;
                
                if(!isMax) {
                    div.querySelector('button').onclick = () => {
                        if(totalPoints >= price) {
                            totalPoints -= price; upgrades[key]++;
                            localStorage.setItem('neonStrike_totalPoints', totalPoints); localStorage.setItem('neonStrike_upgrades', JSON.stringify(upgrades));
                            Audio.powerup(); renderUpgradeUI(); renderShipUI();
                        }
                    };
                }
                list.appendChild(div);
            }
        }

        function renderSettingsUI() {
            const grid = document.getElementById('settingsGrid');
            grid.innerHTML = '';
            
            const col1 = document.createElement('div');
            col1.className = 'settings-column';
            col1.innerHTML = '<div class="settings-column-title">OYUN & SES</div>';
            
            const col2 = document.createElement('div');
            col2.className = 'settings-column';
            col2.innerHTML = '<div class="settings-column-title">GÖRSEL EFEKTLER</div>';
            
            const createToggle = (key, label) => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.style.width = '100%';
                btn.style.padding = '12px 20px';
                btn.style.fontSize = '16px';
                btn.style.borderColor = gameSettings[key] ? "#00ffff" : "#ff0055";
                btn.style.color = gameSettings[key] ? "#00ffff" : "#ff0055";
                btn.style.textShadow = gameSettings[key] ? "0 0 10px #00ffff" : "none";
                btn.textContent = `${label}: ${gameSettings[key] ? "AÇIK" : "KAPALI"}`;
                btn.onclick = () => {
                    gameSettings[key] = !gameSettings[key];
                    localStorage.setItem('neonStrike_settings', JSON.stringify(gameSettings));
                    renderSettingsUI();
                    applySettings();
                };
                return btn;
            };

            col1.appendChild(createToggle('music', 'MÜZİK'));
            col1.appendChild(createToggle('sfx', 'SES EFEKTLERİ'));
            col1.appendChild(createToggle('screenShake', 'EKRAN SARSINTISI'));
            col1.appendChild(createToggle('damageNumbers', 'HASAR YAZILARI'));

            col2.appendChild(createToggle('crt', 'RETRO CRT EFEKTİ'));

            const cursorSettingsDiv = document.createElement('div');
            cursorSettingsDiv.style.width = '100%';
            cursorSettingsDiv.style.marginTop = '10px';
            cursorSettingsDiv.style.textAlign = 'center';
            cursorSettingsDiv.style.background = 'rgba(0,0,0,0.3)';
            cursorSettingsDiv.style.padding = '15px';
            cursorSettingsDiv.style.borderRadius = '4px';
            cursorSettingsDiv.style.border = '1px solid rgba(255,255,255,0.1)';
            
            const cursorLabel = document.createElement('div');
            cursorLabel.textContent = 'NİŞANGÂH RENGİ';
            cursorLabel.style.color = '#fff';
            cursorLabel.style.marginBottom = '12px';
            cursorLabel.style.fontSize = '14px';
            cursorLabel.style.fontWeight = 'bold';
            cursorLabel.style.letterSpacing = '1px';
            
            const colorsFlex = document.createElement('div');
            colorsFlex.style.display = 'flex';
            colorsFlex.style.justifyContent = 'center';
            colorsFlex.style.gap = '15px';
            colorsFlex.style.flexWrap = 'wrap';
            
            const colors = ['#00ffff', '#ff00ff', '#00ff55', '#ffaa00', '#ff0055', '#ffffff'];
            if (!gameSettings.cursorColor) gameSettings.cursorColor = '#00ffff';

            colors.forEach(c => {
                const cBtn = document.createElement('div');
                cBtn.style.width = '24px';
                cBtn.style.height = '24px';
                cBtn.style.backgroundColor = c;
                cBtn.style.cursor = 'pointer';
                cBtn.style.borderRadius = '50%';
                cBtn.style.border = gameSettings.cursorColor === c ? '2px solid #fff' : '2px solid transparent';
                cBtn.style.boxShadow = gameSettings.cursorColor === c ? `0 0 15px ${c}` : 'none';
                cBtn.style.transition = 'all 0.2s';
                cBtn.onclick = () => {
                    gameSettings.cursorColor = c;
                    localStorage.setItem('neonStrike_settings', JSON.stringify(gameSettings));
                    renderSettingsUI();
                };
                colorsFlex.appendChild(cBtn);
            });

            cursorSettingsDiv.appendChild(cursorLabel);
            cursorSettingsDiv.appendChild(colorsFlex);
            col2.appendChild(cursorSettingsDiv);

            grid.appendChild(col1);
            grid.appendChild(col2);

            // --- SIFIRLAMA BUTONU ---
            const resetContainer = document.createElement('div');
            resetContainer.style.gridColumn = '1 / -1'; 
            resetContainer.style.display = 'flex';
            resetContainer.style.justifyContent = 'center';
            resetContainer.style.marginTop = '10px';

            let resetClicks = 0;
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn';
            resetBtn.style.borderColor = '#ff0055';
            resetBtn.style.color = '#ff0055';
            resetBtn.style.padding = '12px 40px';
            resetBtn.style.fontSize = '16px';
            resetBtn.textContent = 'TÜM İLERLEMEYİ SIFIRLA';
            
            resetBtn.onclick = () => {
                if (resetClicks === 0) {
                    resetBtn.textContent = 'EMİN MİSİN? (ONAY İÇİN TEKRAR BAS)';
                    resetBtn.style.backgroundColor = 'rgba(255, 0, 85, 0.2)';
                    resetBtn.style.textShadow = '0 0 10px #ff0055';
                    resetBtn.style.boxShadow = '0 0 15px rgba(255, 0, 85, 0.4)';
                    resetClicks++;
                    
                    setTimeout(() => {
                        if (resetClicks === 1) {
                            resetClicks = 0;
                            resetBtn.textContent = 'TÜM İLERLEMEYİ SIFIRLA';
                            resetBtn.style.backgroundColor = 'transparent';
                            resetBtn.style.textShadow = 'none';
                            resetBtn.style.boxShadow = 'none';
                        }
                    }, 3000);
                } else {
                    const keysToRemove = [
                        'neonStrike_nickname', 'neonStrike_highScores', 'neonStrike_totalPoints',
                        'neonStrike_unlockedShips', 'neonStrike_upgrades', 'neonStrike_settings',
                        'neonStrike_ship', 'neonStrike_theme'
                    ];
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    location.reload(); 
                }
            };
            
            resetContainer.appendChild(resetBtn);
            grid.appendChild(resetContainer);
        }

        function applySettings() {
            ui.crtOverlay.style.display = gameSettings.crt ? 'block' : 'none';
            if (!gameSettings.music) { Audio.stopMusic(); }
            else if (Game.running && !Game.paused && Audio.bgMusic && Audio.bgMusic.paused) { Audio.startMusic(); }
        }

        // --- GÖRSEL EFEKTLER & UTILS ---
        class FloatingText {
            constructor(x, y, text, color, size) { this.x = x; this.y = y; this.text = text; this.color = color; this.size = size; this.life = 1.0; this.vy = -1; }
            update() { this.y += this.vy; this.life -= 0.02; }
            draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.font = `bold ${this.size}px Rajdhani`; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
        }
        
        class Shockwave {
            constructor(x, y, color) { this.x = x; this.y = y; this.color = color; this.radius = 5; this.life = 1.0; }
            update() { this.radius += 8; this.life -= 0.04; }
            draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.strokeStyle = this.color; ctx.lineWidth = 4 * this.life; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
        }
        class Particle {
            constructor(x, y, color, speed, size, type = 'normal') {
                this.x = x; this.y = y; this.color = color; this.angle = Math.random() * Math.PI * 2; this.speed = Math.random() * speed;
                this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed;
                this.life = 1.0; this.decay = Math.random() * 0.02 + 0.015; this.size = size; this.type = type; this.friction = 0.96;
            }
            update() {
                this.x += this.vx; this.y += this.vy; this.vx *= this.friction; this.vy *= this.friction; this.life -= this.decay;
                if(this.type === 'spark') this.size *= 0.9;
            }
            draw() {
                ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color;
                if (this.type === 'normal') { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); } 
                else if (this.type === 'spark') { ctx.lineWidth = 2; ctx.strokeStyle = this.color; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3); ctx.stroke(); }
                ctx.restore();
            }
        }
        class Bullet {
            constructor(x, y, angle, isEnemy = false, speedMult=1) {
                this.x = x; this.y = y; this.isEnemy = isEnemy;
                this.speed = (isEnemy ? 8 : 18) * speedMult;
                this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed;
                this.active = true; this.color = isEnemy ? '#ff0055' : '#00ffff'; this.trail = [];
            }
            update() {
                this.trail.push({x: this.x, y: this.y}); if(this.trail.length > 5) this.trail.shift();
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.active = false;
            }
            draw() {
                ctx.save(); ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
                ctx.beginPath(); if(this.trail.length > 0) { ctx.moveTo(this.trail[0].x, this.trail[0].y); for(let t of this.trail) ctx.lineTo(t.x, t.y); }
                ctx.lineTo(this.x, this.y); ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI*2); ctx.fill(); ctx.restore();
            }
        }
        class Powerup {
            constructor() {
                this.x = Math.random() * (width - 100) + 50; this.y = -50;
                const r = Math.random();
                if (r < 0.3) this.type = 'heal'; else if (r < 0.6) this.type = 'spread'; else if (r < 0.8) this.type = 'rapid'; else this.type = 'shield';
                this.active = true; this.angle = 0;
            }
            update() { this.y += 2; this.angle += 0.05; if(this.y > height + 50) this.active = false; }
            draw() {
                ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
                let color = '#fff', symbol = '';
                if (this.type === 'heal') { color = '#00ff00'; symbol = '+'; } else if (this.type === 'spread') { color = '#ffff00'; symbol = 'W'; } else if (this.type === 'shield') { color = '#00aaff'; symbol = 'S'; } else if (this.type === 'rapid') { color = '#ff00ff'; symbol = 'R'; } 
                ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
                ctx.strokeRect(-15, -15, 30, 30); ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(symbol, 0, 0); ctx.restore();
            }
        }

        // --- YARDIMCI DRON (PET) ---
        class Drone {
            constructor(player) {
                this.p = player; this.x = player.x; this.y = player.y; this.angle = 0;
                this.lastShot = 0; this.fireRate = 500 - (upgrades.drone * 50);
            }
            update() {
                if(upgrades.drone === 0) return;
                this.angle += 0.05;
                const targetX = this.p.x + Math.cos(this.angle) * 40;
                const targetY = this.p.y + Math.sin(this.angle) * 40;
                this.x += (targetX - this.x) * 0.1;
                this.y += (targetY - this.y) * 0.1;

                if (Date.now() - this.lastShot > this.fireRate && Game.enemies.length > 0) {
                    let nearest = null; let minDist = Infinity;
                    Game.enemies.forEach(e => {
                        let d = Math.hypot(e.x - this.x, e.y - this.y);
                        if(d < minDist) { minDist = d; nearest = e; }
                    });
                    if (nearest && minDist < 400) {
                        let ang = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                        Game.bullets.push(new Bullet(this.x, this.y, ang, false, 0.8)); 
                        this.lastShot = Date.now();
                        Audio.playTone(600, 'square', 0.05, 0.05);
                    }
                }
            }
            draw() {
                if(upgrades.drone === 0) return;
                ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle * 2);
                ctx.strokeStyle = '#00ffaa'; ctx.fillStyle = '#000'; ctx.lineWidth = 2;
                ctx.shadowBlur = 10; ctx.shadowColor = '#00ffaa';
                ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, 6); ctx.lineTo(-4, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
        }

        // --- DÜŞMANLAR ---
        class Enemy {
            constructor(typeOverride = null) {
                if (Math.random() < 0.5) { this.x = Math.random() < 0.5 ? -40 : width + 40; this.y = Math.random() * height; } 
                else { this.x = Math.random() * width; this.y = Math.random() < 0.5 ? -40 : height + 40; }

                this.type = typeOverride !== null ? typeOverride : 0;
                if (typeOverride === null) {
                    const r = Math.random();
                    if (Game.score > 100 && r > 0.5) this.type = 1;
                    else if (Game.score > 250 && r > 0.6) this.type = 4;
                    else if (Game.score > 500 && r > 0.7) this.type = 2;
                    else if (Game.score > 750 && r > 0.8) this.type = 3;
                    else if (Game.score > 1000 && r > 0.85) this.type = 5; 
                    else if (Game.score > 1500 && r > 0.92) this.type = 6; 
                    else if (Game.score > 2000 && r > 0.95) this.type = 7; 
                }

                this.active = true; this.angle = 0;
                this.radius = 15; this.hp = 1; this.maxHp = 1; this.color = '#ff0055'; this.scoreVal = 20;

                if (this.type === 0) { this.speed = 2 + Math.random(); } 
                else if (this.type === 1) { this.speed = 5 + Math.random(); this.color = '#ffcc00'; this.radius = 12; this.scoreVal = 40; } 
                else if (this.type === 2) { this.speed = 0.8; this.color = '#00ff55'; this.radius = 30; this.hp = 8; this.maxHp = 8; this.scoreVal = 100; } 
                else if (this.type === 3) { this.speed = 1.5; this.color = '#aa00ff'; this.radius = 20; this.hp = 3; this.maxHp = 3; this.scoreVal = 80; this.lastShot = 0; } 
                else if (this.type === 4) { this.speed = 1.8; this.color = '#ff6600'; this.radius = 22; this.hp = 2; this.maxHp = 2; this.scoreVal = 60; }
                else if (this.type === 5) { this.speed = 2.5; this.color = '#888'; this.radius = 15; this.hp = 2; this.scoreVal = 70; } 
                else if (this.type === 6) { this.speed = 0.5; this.color = '#440044'; this.radius = 35; this.hp = 15; this.maxHp = 15; this.scoreVal = 200; } 
                else if (this.type === 7) { this.speed = 1.2; this.color = '#fff'; this.radius = 18; this.hp = 4; this.scoreVal = 90; this.lastDrop = 0; } 
                else if (this.type === 8) { this.speed = 0; this.color = '#ff0000'; this.radius = 10; this.hp = 1; this.scoreVal = 10; this.pulse = 0; } 

                const diff = diffSettings[currentDifficulty];
                this.speed *= diff.speedMult;
                this.maxHp = Math.max(1, Math.ceil(this.maxHp * diff.hpMult));
                this.hp = this.maxHp;
                
                this.alpha = 1;
            }

            update(px, py) {
                const dx = px - this.x, dy = py - this.y;
                const dist = Math.hypot(dx, dy);
                this.angle = Math.atan2(dy, dx);

                if (this.type === 3) { 
                    if (dist > 250) { this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed; }
                    if (Date.now() - this.lastShot > 2000 && dist < 600) {
                        Game.enemyBullets.push(new Bullet(this.x, this.y, this.angle, true));
                        this.lastShot = Date.now(); this.x -= Math.cos(this.angle) * 5; this.y -= Math.sin(this.angle) * 5;
                    }
                } 
                else if (this.type === 5) { 
                    this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed;
                    this.alpha = dist < 200 ? 1 : (dist < 350 ? (350 - dist)/150 : 0.1);
                }
                else if (this.type === 6) { 
                    this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed;
                    this.angle += 0.05; 
                    if(dist < 500 && !Game.player.isDashing) {
                        Game.player.x -= Math.cos(this.angle) * (500-dist)/200;
                        Game.player.y -= Math.sin(this.angle) * (500-dist)/200;
                    }
                }
                else if (this.type === 7) { 
                    this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed;
                    if(Date.now() - this.lastDrop > 3000) {
                        let mine = new Enemy(8); mine.x = this.x; mine.y = this.y; Game.enemies.push(mine);
                        this.lastDrop = Date.now();
                    }
                }
                else if (this.type === 8) { 
                    this.pulse += 0.1;
                }
                else {
                    this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed;
                }
            }

            draw() {
                ctx.save(); ctx.globalAlpha = this.alpha;
                ctx.translate(this.x, this.y); ctx.rotate(this.angle);
                ctx.shadowBlur = 10; ctx.shadowColor = this.color;
                ctx.fillStyle = '#000'; ctx.strokeStyle = this.color; ctx.lineWidth = 2;

                ctx.beginPath();
                if (this.type === 0 || this.type === 5) { ctx.rect(-this.radius, -this.radius, this.radius*2, this.radius*2); } 
                else if (this.type === 1) { ctx.moveTo(this.radius, 0); ctx.lineTo(-this.radius, this.radius); ctx.lineTo(-this.radius, -this.radius); ctx.closePath(); } 
                else if (this.type === 2) { for(let i=0; i<6; i++) ctx.lineTo(this.radius*Math.cos(i*Math.PI/3), this.radius*Math.sin(i*Math.PI/3)); ctx.closePath(); ctx.fillStyle = `rgba(0, 255, 85, ${this.hp/this.maxHp})`; ctx.fill(); ctx.fillStyle = '#000'; } 
                else if (this.type === 3) { ctx.moveTo(this.radius, 0); ctx.lineTo(0, this.radius/1.5); ctx.lineTo(-this.radius, 0); ctx.lineTo(0, -this.radius/1.5); ctx.closePath(); ctx.moveTo(5, 0); ctx.arc(0, 0, 5, 0, Math.PI*2); }
                else if (this.type === 4) { for(let i=0; i<5; i++) { let a = i * 2 * Math.PI / 5; ctx.lineTo(this.radius * Math.cos(a), this.radius * Math.sin(a)); } ctx.closePath(); }
                else if (this.type === 6) { 
                    ctx.setLineDash([5, 5]); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
                    ctx.beginPath(); ctx.arc(0,0, this.radius*0.5, 0, Math.PI*2); ctx.fill(); 
                }
                else if (this.type === 7) { ctx.rect(-this.radius, -this.radius*0.6, this.radius*2, this.radius*1.2); ctx.moveTo(0,-this.radius); ctx.lineTo(0, this.radius); }
                else if (this.type === 8) { ctx.arc(0,0, this.radius + Math.sin(this.pulse)*3, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,0,0,0.5)'; ctx.fill(); }
                
                ctx.stroke(); if(this.type !== 2 && this.type !== 6 && this.type !== 8) ctx.fill();
                ctx.restore();
            }
        }

        // --- OYUNCU ---
        class Player {
            constructor() {
                const sData = shipsData.find(s => s.id === selectedShip) || shipsData[0];
                
                this.x = width / 2; this.y = height / 2; this.angle = 0;
                let armorBonus = 1 + (upgrades.armor * 0.1);
                this.hp = sData.hp * armorBonus; this.maxHp = this.hp;
                
                this.speed = 0; this.maxSpeed = sData.speed; this.accel = sData.speed / 12; this.friction = 0.9;
                this.vx = 0; this.vy = 0;
                
                this.lastShot = 0; this.fireRate = sData.fireRate;
                this.baseWeaponLevel = sData.weapon; this.weaponLevel = this.baseWeaponLevel; this.rapidFireTimer = 0; 
                
                this.dashCooldownMax = sData.dashCd; this.dashCooldown = 0; this.dashTimer = 0; this.isDashing = false;
                this.shield = 0;
            }

            update() {
                let ax = 0, ay = 0;
                if (isMobile) {
                    ax = Game.joyLeft.x; ay = Game.joyLeft.y;
                    this.vx = ax * this.maxSpeed; this.vy = ay * this.maxSpeed;
                } else {
                    if (Game.keys.w) ay = -1; if (Game.keys.s) ay = 1; if (Game.keys.a) ax = -1; if (Game.keys.d) ax = 1;
                    if (ax !== 0 || ay !== 0) { const len = Math.hypot(ax, ay); ax /= len; ay /= len; this.vx += ax * this.accel; this.vy += ay * this.accel; }
                    this.vx *= this.friction; this.vy *= this.friction;
                }

                if (this.dashCooldown > 0) this.dashCooldown--;
                if (Game.keys.space && this.dashCooldown <= 0 && !isMobile) this.triggerDash();

                if (this.isDashing) {
                    this.x += this.vx * 2.5; this.y += this.vy * 2.5; this.dashTimer--;
                    Game.spawnParticles(this.x, this.y, '#00ffff', 1, 2, 'spark');
                    if (this.dashTimer <= 0) { this.isDashing = false; this.vx *= 0.5; this.vy *= 0.5; }
                } else {
                    this.x += this.vx; this.y += this.vy;
                }

                this.x = Math.max(15, Math.min(width - 15, this.x)); this.y = Math.max(15, Math.min(height - 15, this.y));

                if (isMobile) { if (Math.abs(Game.joyRight.x) > 0.1 || Math.abs(Game.joyRight.y) > 0.1) this.angle = Math.atan2(Game.joyRight.y, Game.joyRight.x); } 
                else { this.angle = Math.atan2(Game.mouse.y - this.y, Game.mouse.x - this.x); }

                let currentFireRate = this.fireRate;
                if (this.rapidFireTimer > 0) { this.rapidFireTimer--; currentFireRate = Math.min(30, this.fireRate / 3); }

                const now = Date.now();
                let shooting = isMobile ? (Math.abs(Game.joyRight.x) > 0.3 || Math.abs(Game.joyRight.y) > 0.3) : Game.mouse.down;
                if (shooting && now - this.lastShot > currentFireRate) { this.shoot(); this.lastShot = now; }
            }

            triggerDash() {
                this.isDashing = true; this.dashTimer = 10; this.dashCooldown = this.dashCooldownMax; Audio.dash();
                if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) { this.vx = Math.cos(this.angle) * this.maxSpeed * 2; this.vy = Math.sin(this.angle) * this.maxSpeed * 2; } 
                else { const speed = Math.hypot(this.vx, this.vy); this.vx = (this.vx / speed) * this.maxSpeed * 2; this.vy = (this.vy / speed) * this.maxSpeed * 2; }
            }

            shoot() {
                Audio.shoot(); Game.bullets.push(new Bullet(this.x, this.y, this.angle));
                if (this.weaponLevel >= 2) { Game.bullets.push(new Bullet(this.x, this.y, this.angle - 0.2)); Game.bullets.push(new Bullet(this.x, this.y, this.angle + 0.2)); }
                this.x -= Math.cos(this.angle) * 3; this.y -= Math.sin(this.angle) * 3;
            }

            draw() {
                ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); const time = Date.now();
                if (this.shield > 0) {
                    ctx.beginPath(); ctx.arc(0, 0, 25 + Math.sin(time/100)*2, 0, Math.PI*2);
                    ctx.strokeStyle = `rgba(0, 255, 170, ${0.3 + this.shield/5})`; ctx.lineWidth = 2;
                    ctx.shadowBlur = 10; ctx.shadowColor = '#00ffaa'; ctx.stroke();
                }

                let thrust = this.isDashing ? 25 : (Math.hypot(this.vx, this.vy) > 1 ? 15 : 0);
                let isShooting = (time - this.lastShot < 200);
                drawShipModel(ctx, selectedShip, time, thrust, isShooting);
                ctx.restore();
            }
        }

        // --- OYUN MOTORU ---
        const Game = {
            running: false, paused: false, score: 0, combo: 0, comboTimer: 0,
            player: null, drone: null,
            bullets: [], enemyBullets: [], enemies: [], particles: [], texts: [], powerups: [], shockwaves: [],
            stars: [], matrixDrops: [],
            keys: { w: false, a: false, s: false, d: false, space: false },
            mouse: { x: window.innerWidth/2, y: window.innerHeight/2, down: false },
            joyLeft: { x: 0, y: 0 }, joyRight: { x: 0, y: 0 },
            shake: 0, hitStop: 0, gridOffset: 0, lastFrameTime: 0,
            settingsOrigin: 'start',
            
            init() {
                this.resize(); window.addEventListener('resize', () => this.resize());
                window.addEventListener('keydown', e => {
                    if(e.key === 'Escape') {
                        if (ui.settings.classList.contains('active')) {
                            this.closeSettings();
                        } else {
                            this.togglePause();
                        }
                    }
                    this.handleKey(e, true);
                });
                window.addEventListener('keyup', e => this.handleKey(e, false));
                window.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
                window.addEventListener('mousedown', () => this.mouse.down = true);
                window.addEventListener('mouseup', () => this.mouse.down = false);
                this.setupJoystick('stickLeft', 'knobLeft', this.joyLeft);
                this.setupJoystick('stickRight', 'knobRight', this.joyRight);
                this.attractLoop();
            },

            resize() {
                width = window.innerWidth; height = window.innerHeight;
                canvas.width = width; canvas.height = height;
                this.stars = Array.from({length: 150}, () => ({x: Math.random()*width, y: Math.random()*height, s: Math.random()*2+0.5}));
                this.matrixDrops = Array.from({length: Math.floor(width/20)}, () => Math.random()*-height);
            },

            handleKey(e, state) {
                const k = e.key.toLowerCase();
                if (k === 'w') this.keys.w = state; if (k === 'a') this.keys.a = state;
                if (k === 's') this.keys.s = state; if (k === 'd') this.keys.d = state;
                if (k === ' ') this.keys.space = state;
            },

            setupJoystick(zoneId, knobId, output) {
                const zone = document.getElementById(zoneId); const knob = document.getElementById(knobId);
                let dragging = false;
                const handleMove = (e) => {
                    if (!dragging) return; e.preventDefault();
                    const touch = e.targetTouches ? e.targetTouches[0] : e;
                    const rect = zone.getBoundingClientRect(); const cx = rect.left + rect.width/2; const cy = rect.top + rect.height/2;
                    let dx = touch.clientX - cx, dy = touch.clientY - cy;
                    const dist = Math.hypot(dx, dy), max = rect.width/2;
                    if (dist > max) { dx = (dx/dist) * max; dy = (dy/dist) * max; }
                    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                    output.x = dx / max; output.y = dy / max;
                };
                const reset = () => { dragging = false; output.x = 0; output.y = 0; knob.style.transform = `translate(-50%, -50%)`; };
                zone.addEventListener('touchstart', e => { dragging = true; handleMove(e); }, {passive: false});
                zone.addEventListener('touchmove', handleMove, {passive: false}); zone.addEventListener('touchend', reset);
            },

            start() {
                let nickname = ui.nicknameInput.value.trim().toUpperCase() || 'GUEST'; localStorage.setItem('neonStrike_nickname', nickname);
                const diffNames = { easy: 'KOLAY', normal: 'NORMAL', hard: 'ZOR' };
                ui.playerNameDisplay.textContent = nickname;
                ui.difficultyDisplay.textContent = `ZORLUK: ${diffNames[currentDifficulty]}`;
                ui.highScore.textContent = `HI: ${highScores[currentDifficulty]}`;

                Audio.init(); 
                if (Audio.bgMusic) Audio.bgMusic.volume = 0.4;
                Audio.startMusic();
                
                this.running = true; this.paused = false; this.score = 0; this.combo = 0;
                this.player = new Player();
                this.drone = new Drone(this.player);
                this.bullets = []; this.enemyBullets = []; this.enemies = []; this.particles = []; this.texts = []; this.powerups = []; this.shockwaves = [];

                ui.start.classList.remove('active'); ui.gameOver.classList.remove('active'); ui.pause.classList.remove('active'); ui.upgrade.classList.remove('active'); ui.settings.classList.remove('active');
                ui.score.textContent = 0; 
                ui.health.style.width = '100%';
                ui.healthText.textContent = `%${Math.max(0, Math.ceil((this.player.hp / this.player.maxHp) * 100))}`;
                
                this.spawnLoop(); this.powerupLoop();
                this.lastFrameTime = performance.now();
                requestAnimationFrame((t) => this.loop(t));
            },

            togglePause() {
                if(!this.running) return;
                this.paused = !this.paused;
                if (this.paused) { 
                    ui.pause.classList.add('active'); 
                    Audio.masterGain.gain.value = 0.05; 
                    if (Audio.bgMusic) Audio.bgMusic.volume = 0.1;
                } 
                else { 
                    ui.pause.classList.remove('active'); 
                    Audio.masterGain.gain.value = 0.25; 
                    if (Audio.bgMusic) Audio.bgMusic.volume = 0.4;
                    this.lastFrameTime = performance.now(); 
                    requestAnimationFrame((t) => this.loop(t)); 
                }
            },

            spawnLoop() {
                if (!this.running) return;
                if (!this.paused) {
                    let rate = Math.max(400, 2000 - (this.score * 2.5)); rate *= diffSettings[currentDifficulty].spawnRate;
                    this.enemies.push(new Enemy());
                    setTimeout(() => this.spawnLoop(), rate);
                } else {
                    setTimeout(() => this.spawnLoop(), 500);
                }
            },

            powerupLoop() {
                if (!this.running) return;
                if (!this.paused) { setTimeout(() => { this.powerups.push(new Powerup()); this.powerupLoop(); }, 10000 + Math.random() * 5000); } 
                else { setTimeout(() => this.powerupLoop(), 1000); }
            },

            spawnParticles(x, y, color, count, speed, type) { for(let i=0; i<count; i++) this.particles.push(new Particle(x, y, color, speed, Math.random()*3+1, type)); },
            addText(x, y, text, color, size=20) { this.texts.push(new FloatingText(x, y, text, color, size)); },
            addShockwave(x, y, color) { this.shockwaves.push(new Shockwave(x, y, color)); },
            increaseCombo() { this.combo++; this.comboTimer = 120; ui.combo.textContent = `COMBO x${this.combo}`; ui.combo.style.opacity = 1; ui.combo.style.transform = 'scale(1)'; },

            loop(timestamp) {
                if (!this.running || this.paused) return;
                if (this.hitStop > 0) { this.hitStop--; requestAnimationFrame((t) => this.loop(t)); return; }
                if (this.comboTimer > 0) { this.comboTimer--; if(this.comboTimer <= 0) { this.combo = 0; ui.combo.style.opacity = 0; } }

                let rx = 0, ry = 0;
                if (this.shake > 0) { 
                    if (gameSettings.screenShake) {
                        rx = (Math.random() - 0.5) * this.shake; 
                        ry = (Math.random() - 0.5) * this.shake; 
                    }
                    this.shake *= 0.9; 
                    if(this.shake < 0.5) this.shake = 0; 
                }

                ctx.setTransform(1, 0, 0, 1, rx, ry);
                ctx.fillStyle = themesData[selectedTheme].bg; ctx.fillRect(0, 0, width, height);

                this.drawBackground(ctx, width, height);

                this.player.update(); this.player.draw();
                this.drone.update(); this.drone.draw();
                this.updateBullets(); this.updateEnemies();

                for (let i = this.shockwaves.length - 1; i >= 0; i--) { let s = this.shockwaves[i]; s.update(); s.draw(); if(s.life <= 0) this.shockwaves.splice(i, 1); }
                this.powerups.forEach((p, i) => { p.update(); p.draw(); if(Math.hypot(p.x - this.player.x, p.y - this.player.y) < 30) { this.applyPowerup(p.type); this.powerups.splice(i, 1); } });
                for (let i = this.particles.length - 1; i >= 0; i--) { let p = this.particles[i]; p.update(); p.draw(); if(p.life <= 0) this.particles.splice(i, 1); }
                for (let i = this.texts.length - 1; i >= 0; i--) { let t = this.texts[i]; t.update(); t.draw(); if(t.life <= 0) this.texts.splice(i, 1); }

                this.drawCustomCursor();
                requestAnimationFrame((t) => this.loop(t));
            },

            drawCustomCursor() {
                if (isMobile) return;
                ctx.save(); ctx.translate(this.mouse.x, this.mouse.y); ctx.lineWidth = 2; 
                let cColor = gameSettings.cursorColor || themesData[selectedTheme].uiColor;
                ctx.strokeStyle = cColor; ctx.shadowBlur = 10; ctx.shadowColor = cColor;
                ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-3, 0); ctx.moveTo(10, 0); ctx.lineTo(3, 0); ctx.moveTo(0, -10); ctx.lineTo(0, -3); ctx.moveTo(0, 10); ctx.lineTo(0, 3); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.stroke(); ctx.restore();
            },

            drawBackground(context, w, h) {
                context.save(); const time = Date.now();
                if (selectedTheme === 0) {
                    context.strokeStyle = 'rgba(0, 255, 255, 0.08)'; context.lineWidth = 1; this.gridOffset = (this.gridOffset + 1) % 40;
                    context.beginPath(); for (let x = this.gridOffset; x < w; x += 40) { context.moveTo(x, 0); context.lineTo(x, h); } for (let y = this.gridOffset; y < h; y += 40) { context.moveTo(0, y); context.lineTo(w, y); } context.stroke();
                    context.fillStyle = '#fff'; for(let i=0; i<5; i++) if(Math.random() > 0.9) context.fillRect(Math.random()*w, Math.random()*h, 2, 2);
                }
                else if (selectedTheme === 1) {
                    context.fillStyle = '#fff';
                    this.stars.forEach(star => { star.y += star.s; if(star.y > h) { star.y = 0; star.x = Math.random()*w; } context.globalAlpha = star.s / 3; context.beginPath(); context.arc(star.x, star.y, star.s, 0, Math.PI*2); context.fill(); });
                }
                else if (selectedTheme === 2) {
                    context.fillStyle = 'rgba(0, 255, 85, 0.15)'; context.font = '15px monospace';
                    for(let i=0; i<this.matrixDrops.length; i++) {
                        const char = String.fromCharCode(0x30A0 + Math.random() * 96); context.fillText(char, i*20, this.matrixDrops[i]);
                        this.matrixDrops[i] += 5; if(this.matrixDrops[i] > h && Math.random() > 0.95) this.matrixDrops[i] = 0;
                    }
                }
                else if (selectedTheme === 3) {
                    context.strokeStyle = 'rgba(255, 170, 0, 0.08)'; context.lineWidth = 1;
                    const hexSize = 30; const hexW = Math.sqrt(3) * hexSize; const hexH = 2 * hexSize; const offsetY = (time / 20) % (hexH * 0.75);
                    context.beginPath();
                    for (let y = -hexH; y < h + hexH; y += hexH * 0.75) {
                        for (let x = -hexW; x < w + hexW; x += hexW) {
                            let px = x + ((Math.round(y / (hexH * 0.75)) % 2) ? hexW / 2 : 0); let py = y + offsetY;
                            context.moveTo(px + hexSize * Math.sin(0), py + hexSize * Math.cos(0));
                            for (let i = 1; i <= 6; i++) { context.lineTo(px + hexSize * Math.sin(i * Math.PI / 3), py + hexSize * Math.cos(i * Math.PI / 3)); }
                        }
                    }
                    context.stroke();
                }
                context.restore();
            },

            updateBullets() {
                for (let i = this.bullets.length - 1; i >= 0; i--) { let b = this.bullets[i]; b.update(); b.draw(); if (!b.active) this.bullets.splice(i, 1); }
                for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                    let b = this.enemyBullets[i]; b.update(); b.draw();
                    if (b.active && Math.hypot(b.x - this.player.x, b.y - this.player.y) < 15) { this.damagePlayer(15); b.active = false; }
                    if (!b.active) this.enemyBullets.splice(i, 1);
                }
            },

            updateEnemies() {
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    let e = this.enemies[i]; e.update(this.player.x, this.player.y); e.draw();

                    for (let j = this.bullets.length - 1; j >= 0; j--) {
                        let b = this.bullets[j];
                        if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 10) {
                            e.hp--; b.active = false; this.spawnParticles(b.x, b.y, b.color, 3, 5, 'spark'); Audio.hit();
                            
                            if(gameSettings.damageNumbers) {
                                this.addText(e.x + (Math.random()*20-10), e.y - 10, "-1", '#fff', 14);
                            }
                            
                            if (e.hp <= 0) { this.killEnemy(e); break; }
                        }
                    }

                    if (e.active && Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.radius + 15) {
                        if (this.player.isDashing || e.type === 6) { if(e.type !== 6) this.killEnemy(e); } 
                        else { this.damagePlayer(20); this.killEnemy(e, false); }
                    }
                    if (!e.active) this.enemies.splice(i, 1);
                }
            },

            killEnemy(e, awardScore = true) {
                e.active = false; this.spawnParticles(e.x, e.y, e.color, 15, 6, 'normal'); this.addShockwave(e.x, e.y, e.color); this.shake = 8; Audio.explosion();
                if (e.type === 4 && awardScore) {
                    let s1 = new Enemy(0); s1.x = e.x - 15; s1.y = e.y; s1.radius=10; s1.hp=1; s1.speed = 3.5 * diffSettings[currentDifficulty].speedMult;
                    let s2 = new Enemy(0); s2.x = e.x + 15; s2.y = e.y; s2.radius=10; s2.hp=1; s2.speed = 3.5 * diffSettings[currentDifficulty].speedMult;
                    this.enemies.push(s1, s2);
                }
                if (awardScore) {
                    this.increaseCombo(); const finalPoints = e.scoreVal * (1 + (this.combo * 0.05)) * diffSettings[currentDifficulty].scoreMult;
                    this.score += Math.floor(finalPoints); 
                    if (e.scoreVal > 0) this.addText(e.x, e.y, Math.floor(finalPoints), themesData[selectedTheme].uiColor); 
                    ui.score.textContent = this.score;
                    if (this.score > highScores[currentDifficulty]) { highScores[currentDifficulty] = this.score; ui.highScore.textContent = `HI: ${highScores[currentDifficulty]}`; }
                }
            },

            damagePlayer(amount) {
                if (this.player.shield > 0) { this.player.shield--; Audio.playTone(800, 'sawtooth', 0.2); this.addText(this.player.x, this.player.y - 30, "BLOCKED", '#00ffaa'); if(this.player.shield <= 0) ui.shield.style.opacity = 0; return; }
                let finalDamage = amount * diffSettings[currentDifficulty].dmgMult; this.player.hp -= finalDamage;
                ui.health.style.width = Math.max(0, (this.player.hp / this.player.maxHp) * 100) + '%';
                ui.healthText.textContent = `%${Math.max(0, Math.ceil((this.player.hp / this.player.maxHp) * 100))}`;
                this.shake = 20; this.hitStop = 5; Audio.playNoise(0.5); ctx.fillStyle = 'rgba(255,0,0,0.3)'; ctx.fillRect(0, 0, width, height);
                if (this.player.hp <= 0) this.gameOver();
            },

            applyPowerup(type) {
                Audio.powerup(); this.addText(this.player.x, this.player.y - 40, type.toUpperCase(), '#ffff00', 30);
                if (type === 'heal') { 
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30); 
                    ui.health.style.width = (this.player.hp / this.player.maxHp * 100) + '%'; 
                    ui.healthText.textContent = `%${Math.max(0, Math.ceil((this.player.hp / this.player.maxHp) * 100))}`;
                } 
                else if (type === 'spread') { this.player.weaponLevel = this.player.baseWeaponLevel + 1; setTimeout(() => { if(this.player) this.player.weaponLevel = this.player.baseWeaponLevel; }, 8000); } 
                else if (type === 'shield') { this.player.shield = 2; ui.shield.style.opacity = 1; } 
                else if (type === 'rapid') { this.player.rapidFireTimer = 300; }
            },

            gameOver() {
                this.running = false; Audio.stopMusic(); Audio.playTone(100, 'sawtooth', 1.0); Audio.playTone(50, 'square', 1.0);
                ui.finalScore.textContent = "TOTAL SCORE: " + this.score;
                
                // Oyundaki skoru toplam puana ekle
                if (this.score > 0) { 
                    totalPoints += this.score; 
                    localStorage.setItem('neonStrike_totalPoints', totalPoints); 
                    ui.totalPointsDisplay.textContent = `TOPLAM PUAN: ${totalPoints}`; 
                }
                
                let currentSaved = highScores[currentDifficulty];
                if (this.score >= currentSaved && this.score > 0) { 
                    highScores[currentDifficulty] = this.score; 
                    localStorage.setItem('neonStrike_highScores', JSON.stringify(highScores)); 
                    ui.newHighScoreLabel.style.display = 'block'; 
                } else { 
                    ui.newHighScoreLabel.style.display = 'none'; 
                }
                
                renderShipUI(); 
                ui.gameOver.classList.add('active');
            },

            goToMainMenu() { ui.gameOver.classList.remove('active'); ui.start.classList.add('active'); if (!this.running) { this.attractLoop(); } },
            restartFromPause() { ui.pause.classList.remove('active'); this.start(); },
            quitToMainMenu() { 
                ui.pause.classList.remove('active'); 
                this.running = false; 
                this.paused = false; 
                Audio.stopMusic(); 
                
                // Oyundan çıkarken puanı yine de ver
                if (this.score > 0) {
                    totalPoints += this.score;
                    localStorage.setItem('neonStrike_totalPoints', totalPoints);
                    ui.totalPointsDisplay.textContent = `TOPLAM PUAN: ${totalPoints}`;
                }
                renderShipUI();
                
                this.goToMainMenu(); 
            },

            openSettingsFrom(origin) {
                this.settingsOrigin = origin;
                if (origin === 'start') ui.start.classList.remove('active');
                if (origin === 'pause') ui.pause.classList.remove('active');
                ui.settings.classList.add('active');
                renderSettingsUI();
            },

            closeSettings() {
                ui.settings.classList.remove('active');
                if (this.settingsOrigin === 'start') {
                    ui.start.classList.add('active');
                } else {
                    ui.pause.classList.add('active');
                }
            },

            attractLoop() {
                if (!this.running) {
                    ctx.fillStyle = themesData[selectedTheme].solidBg; ctx.fillRect(0, 0, width, height); this.drawBackground(ctx, width, height);
                    const time = Date.now();
                    shipsData.forEach(ship => {
                        const c = document.getElementById(`ship-canvas-${ship.id}`);
                        if (c) {
                            const cx = c.getContext('2d'); cx.clearRect(0, 0, c.width, c.height); cx.save(); cx.translate(c.width / 2, c.height / 2); cx.scale(0.65, 0.65); cx.rotate(-Math.PI / 2); 
                            drawShipModel(cx, ship.id, time, 10, false); cx.restore();
                        }
                    });
                    themesData.forEach(t => {
                        const tc = document.getElementById(`theme-canvas-${t.id}`);
                        if (tc) {
                            const tcx = tc.getContext('2d'); tcx.fillStyle = t.solidBg; tcx.fillRect(0, 0, tc.width, tc.height); tcx.save();
                            if (t.id === 0) { tcx.strokeStyle = 'rgba(0, 255, 255, 0.2)'; tcx.lineWidth = 1; tcx.beginPath(); let gOffset = (this.gridOffset % 15); for (let x = gOffset; x < tc.width; x += 15) { tcx.moveTo(x, 0); tcx.lineTo(x, tc.height); } for (let y = gOffset; y < tc.height; y += 15) { tcx.moveTo(0, y); tcx.lineTo(tc.width, y); } tcx.stroke(); } 
                            else if (t.id === 1) { tcx.fillStyle = '#fff'; for(let i=0; i<15; i++) { let sx = (Math.sin(time/1000 + i) * 0.5 + 0.5) * tc.width; let sy = (time/20 + i*10) % tc.height; tcx.beginPath(); tcx.arc(sx, sy, Math.random()*1.5, 0, Math.PI*2); tcx.fill(); } }
                            else if (t.id === 2) { tcx.fillStyle = 'rgba(0, 255, 85, 0.4)'; tcx.font = '10px monospace'; for(let i=0; i<tc.width/10; i++) { let my = (time/15 + i*20) % (tc.height + 20); tcx.fillText("1", i*10, my); tcx.fillText("0", i*10, my - 10); } }
                            else if (t.id === 3) { tcx.strokeStyle = 'rgba(255, 170, 0, 0.2)'; tcx.lineWidth = 1; const hSize = 10; const hW = Math.sqrt(3) * hSize; const hH = 2 * hSize; const hOff = (time / 30) % (hH * 0.75); tcx.beginPath(); for (let y = -hH; y < tc.height + hH; y += hH * 0.75) { for (let x = -hW; x < tc.width + hW; x += hW) { let px = x + ((Math.round(y / (hH * 0.75)) % 2) ? hW / 2 : 0); let py = y + hOff; tcx.moveTo(px + hSize * Math.sin(0), py + hSize * Math.cos(0)); for (let i = 1; i <= 6; i++) tcx.lineTo(px + hSize * Math.sin(i * Math.PI / 3), py + hSize * Math.cos(i * Math.PI / 3)); } } tcx.stroke(); }
                            let grad = tcx.createRadialGradient(tc.width/2, tc.height/2, 0, tc.width/2, tc.height/2, 40); grad.addColorStop(0, t.uiBg.replace('0.1', '0.2')); grad.addColorStop(1, 'transparent'); tcx.fillStyle = grad; tcx.fillRect(0, 0, tc.width, tc.height); tcx.restore();
                        }
                    });
                    requestAnimationFrame(() => this.attractLoop());
                }
            }
        };

        // --- BAŞLATICI KODLAR (INIT) ---
        renderShipUI(); 
        renderThemeUI(); 
        renderUpgradeUI(); 
        renderSettingsUI(); 
        applySettings();

        ui.diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                ui.diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active'); currentDifficulty = btn.getAttribute('data-diff');
                ui.highScore.textContent = `HI: ${highScores[currentDifficulty]}`;
            });
        });

        // PWA ve Eklenti Buton Event Bağlamaları
        document.getElementById('pauseBtn').addEventListener('click', () => Game.togglePause());
        document.getElementById('startBtn').addEventListener('click', () => Game.start());
        document.getElementById('upgradeBtn').addEventListener('click', () => { ui.start.classList.remove('active'); ui.upgrade.classList.add('active'); renderUpgradeUI(); });
        document.getElementById('settingsBtn').addEventListener('click', () => Game.openSettingsFrom('start'));
        document.getElementById('backFromUpgradeBtn').addEventListener('click', () => { ui.upgrade.classList.remove('active'); ui.start.classList.add('active'); ui.totalPointsDisplay.textContent = `TOPLAM PUAN: ${totalPoints}`; });
        document.getElementById('backFromSettingsBtn').addEventListener('click', () => Game.closeSettings());
        document.getElementById('gameOverRetryBtn').addEventListener('click', () => Game.start());
        document.getElementById('gameOverMenuBtn').addEventListener('click', () => Game.goToMainMenu());
        document.getElementById('pauseRestartBtn').addEventListener('click', () => Game.restartFromPause());
        document.getElementById('pauseContinueBtn').addEventListener('click', () => Game.togglePause());
        document.getElementById('pauseSettingsBtn').addEventListener('click', () => Game.openSettingsFrom('pause'));
        document.getElementById('pauseMenuBtn').addEventListener('click', () => Game.quitToMainMenu());

        window.onload = () => Game.init();