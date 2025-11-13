(function(){
	// 小合約
	// - 讀取畫面尺寸，建立 canvas 遮罩
	// - 支援 pointer events (mouse/touch)
	// - 紀錄刮除面積，超過門檻自動 reveal

	const prizes = [
		{text:'8888 元現金', weight:1, big:true},
		{text:'iPhone 1 支', weight:1, big:true},
		{text:'500 元購物金', weight:3},
		{text:'雞排一個（兌換券）', weight:6},
		{text:'再接再厲，明天見', weight:30},
		{text:'Lucky 折扣 85 折', weight:8},
		{text:'VIP 會員 30 天', weight:5}
	];

	const prizeTextEl = document.getElementById('prizeText');
	const canvas = document.getElementById('scratch');
	const ticket = document.getElementById('ticket');
	const prizeArea = document.getElementById('prizeArea');
	const resetBtn = document.getElementById('resetBtn');
	const revealBtn = document.getElementById('revealBtn');
	const modal = document.getElementById('resultModal');
	const modalBody = document.getElementById('modalBody');
	const closeModal = document.getElementById('closeModal');
	const confettiRoot = document.getElementById('confetti');

	let ctx, isDrawing=false, revealed=false, prize=null;

	function pickPrize(){
		// weighted random
		const pool=[];prizes.forEach(p=>{for(let i=0;i<p.weight;i++)pool.push(p)});
		const sel = pool[Math.floor(Math.random()*pool.length)];
		prize = sel;
		prizeTextEl.textContent = sel.text;
	}

	let lastPos = null;
	function resizeCanvas(){
		// 只覆蓋獎品區 (prizeArea)，避免遮住按鈕/說明
		const tRect = ticket.getBoundingClientRect();
		const pRect = prizeArea.getBoundingClientRect();
		const left = pRect.left - tRect.left;
		const top = pRect.top - tRect.top;
		const w = Math.min(800, Math.max(120, Math.floor(pRect.width)));
		const h = Math.max(80, Math.floor(pRect.height));

		// 支援 DPR 以顯得更細緻
		const dpr = window.devicePixelRatio || 1;
		canvas.style.position='absolute';
		canvas.style.left = left + 'px';
		canvas.style.top = top + 'px';
		canvas.style.zIndex = 3;
		canvas.style.width = w + 'px';
		canvas.style.height = h + 'px';
		canvas.width = Math.floor(w * dpr);
		canvas.height = Math.floor(h * dpr);
		const ctx2 = canvas.getContext('2d');
		ctx2.setTransform(dpr,0,0,dpr,0,0);
		drawMask();
	}

	function drawMask(){
		ctx = canvas.getContext('2d');
		// draw silver scratch layer with texture (in CSS pixels thanks to setTransform)
		const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
		g.addColorStop(0,'#bdbdbd');g.addColorStop(1,'#d6d6d6');
		ctx.fillStyle = g;
		ctx.fillRect(0,0,canvas.width,canvas.height);
		// metallic streaks: short slanted strokes to imitate lamination
		ctx.save();
		ctx.globalAlpha = 0.14;
		for(let i=0;i<120;i++){
			ctx.beginPath();
			const x = Math.random()*canvas.width;
			const y = Math.random()*canvas.height;
			const len = 20 + Math.random()*80;
			const angle = (Math.PI/12) * (Math.random()*2-1);
			ctx.moveTo(x,y);
			ctx.lineTo(x+Math.cos(angle)*len, y+Math.sin(angle)*len);
			ctx.strokeStyle = (Math.random()>0.5)?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.12)';
			ctx.lineWidth = 1 + Math.random()*2;
			ctx.stroke();
		}
		ctx.restore();
		// add fine speckles
		for(let i=0;i<600;i++){
			ctx.fillStyle = 'rgba(255,255,255,'+(Math.random()*0.06)+')';
			ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, Math.random()*1.6+0.3, Math.random()*1.6+0.3);
		}
		// set composite so subsequent strokes erase (像真實刮掉金屬層)
		ctx.globalCompositeOperation = 'destination-out';
		ctx.lineCap = 'round'; ctx.lineJoin = 'round';
	}

	function pointerDown(e){
		if(revealed) return; isDrawing=true; lastPos = getPointerPos(e);
		// immediate small mark
		scratchDot(lastPos);
	}
	function pointerUp(e){isDrawing=false; lastPos=null; checkReveal();}
	function pointerMove(e){ if(!isDrawing) return; const pos = getPointerPos(e); scratchLine(lastPos,pos); lastPos = pos; }

	function getPointerPos(e){
		const rect = canvas.getBoundingClientRect();
		const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
		return {x: (p.clientX - rect.left) , y: (p.clientY - rect.top)};
	}

	function scratchDot(pos){
		const r = 14 + Math.random()*12;
		ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2); ctx.fill();
		// add a few little noisy clears for realism
		for(let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(pos.x + (Math.random()-0.5)*r, pos.y + (Math.random()-0.5)*r, Math.random()*6,0,Math.PI*2); ctx.fill(); }
	}

	function scratchLine(a,b){
		if(!a) { scratchDot(b); return; }
		const dx = b.x - a.x, dy = b.y - a.y; const dist = Math.hypot(dx,dy);
		const steps = Math.max(1, Math.floor(dist / 4));
		for(let i=0;i<steps;i++){
			const t = i/steps;
			const x = a.x + dx*t + (Math.random()-0.5)*2;
			const y = a.y + dy*t + (Math.random()-0.5)*2;
			ctx.beginPath();
			const size = 10 + Math.random()*18;
			ctx.arc(x,y,size,0,Math.PI*2);
			ctx.fill();
		}
		// also draw a smoother thin stroke to connect
		ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.lineWidth = 18; ctx.stroke();
	}

	function checkReveal(){
		// 計算透明像素比例 (alpha=0 表示已刮開)
		try{
			const img = ctx.getImageData(0,0,canvas.width,canvas.height).data;
			let cleared=0; for(let i=3;i<img.length;i+=4){ if(img[i]===0) cleared++; }
			const total = canvas.width*canvas.height; const ratio = cleared/total;
			if(ratio > 0.38) reveal(true);
		}catch(err){
			// 有些瀏覽器/情況可能會拒絕跨域或像素取樣，則依照已揭示標記處理
			console.warn('checkReveal error', err);
		}
	}

	function reveal(auto){
		if(revealed) return; revealed=true;
		// 完全清除遮罩
		ctx.clearRect(0,0,canvas.width,canvas.height);
		// 顯示 modal
		modalBody.textContent = prize.text + (prize.big ? ' — 恭喜你！' : '');
		modal.classList.add('show');
		// 若是大獎播放 confetti
		if(prize.big){
			makeConfetti();
			makeStreamers();
		}
		// 儲存到歷史紀錄
		saveRecord(prize);
	}

	function makeConfetti(){
		const colors = ['#ffdd57','#ffd36b','#ff7b7b','#7af3ff','#d4ff7a'];
		for(let i=0;i<40;i++){
			const p = document.createElement('div');p.className='p';
			p.style.background = colors[i%colors.length];
			p.style.left = Math.random()*100 + '%';
			p.style.top = '-10vh';
			p.style.width = (6+Math.random()*8)+'px'; p.style.height = (10+Math.random()*10)+'px';
			p.style.transform = 'rotate('+Math.random()*360+'deg)';
			p.style.animationDelay = (Math.random()*0.3)+'s';
			p.style.opacity = '1';
			p.style.borderRadius = (Math.random()*50)+'%';
			p.style.zIndex = 998;
			confettiRoot.appendChild(p);
			setTimeout(()=>p.remove(),2600);
		}
	}

	function makeStreamers(){
		// create longer ribbon-like streamers
		const colors = ['#ff3b3b','#ffb84d','#ffd36b','#7af3ff','#c9ff7a'];
		const count = 14;
		for(let i=0;i<count;i++){
			const s = document.createElement('div');
			s.className = 'streamer';
			const w = 8 + Math.floor(Math.random()*8);
			s.style.width = w + 'px';
			s.style.height = (80 + Math.random()*160) + 'px';
			s.style.background = colors[i % colors.length];
			// horizontal starting position across stage width
			const left = (10 + Math.random()*80) + '%';
			s.style.left = left;
			s.style.top = '-20vh';
			s.style.zIndex = 994;
			s.style.borderRadius = '6px';
			s.style.boxShadow = '0 8px 14px rgba(0,0,0,0.18)';
			s.style.animation = 'streamer-fall ' + (2.4 + Math.random()*1.2) + 's cubic-bezier(.2,.7,.2,1) forwards';
			confettiRoot.appendChild(s);
			setTimeout(()=>s.remove(), 3200 + Math.random()*800);
		}
	}

	function reset(){
		revealed=false; pickPrize(); modal.classList.remove('show');
		drawMask();
	}

	// event wiring
	window.addEventListener('resize', ()=>{ resizeCanvas(); });
	canvas.addEventListener('pointerdown', pointerDown);
	window.addEventListener('pointerup', pointerUp);
	canvas.addEventListener('pointermove', pointerMove);
	// touch fallback for older browsers
	canvas.addEventListener('touchstart', (e)=>{ pointerDown(e); e.preventDefault(); }, {passive:false});
	canvas.addEventListener('touchmove', (e)=>{ pointerMove(e); e.preventDefault(); }, {passive:false});

	resetBtn.addEventListener('click', ()=>{ reset(); });
	revealBtn.addEventListener('click', ()=>{ reveal(false); });
	// keyboard shortcuts
	window.addEventListener('keydown',(e)=>{
		if(e.key.toLowerCase()==='r') reset();
		if(e.key.toLowerCase()==='v') reveal(false);
	});
	closeModal.addEventListener('click', ()=>{ modal.classList.remove('show'); });

	// history UI wiring
	const historyToggle = document.getElementById('historyToggle');
	const historyPanel = document.getElementById('historyPanel');
	const historyList = document.getElementById('historyList');
	const clearHistoryBtn = document.getElementById('clearHistoryBtn');
	const closeHistoryBtn = document.getElementById('closeHistoryBtn');
	const recentList = document.getElementById('recentList');

	function loadRecords(){
		try{return JSON.parse(localStorage.getItem('scratch_records')||'[]')}catch(e){return []}
	}

	function saveRecord(pr){
		const arr = loadRecords();
		arr.unshift({prize:pr.text, big:!!pr.big, at: new Date().toISOString()});
		if(arr.length>100) arr.pop();
		localStorage.setItem('scratch_records', JSON.stringify(arr));
		renderRecords();
		renderRecent();
	}

	function renderRecords(){
		const arr = loadRecords();
		if(!arr || arr.length===0){ historyList.innerHTML = '<li class="history-empty">尚無紀錄</li>'; return; }
		historyList.innerHTML = arr.map(r=>{
			const time = new Date(r.at).toLocaleString();
			return `<li><div class="r-prize">${r.prize}${r.big?'<span class="r-badge">★</span>':''}</div><div class="r-time">${time}</div></li>`;
		}).join('');
	}

	function renderRecent(){
		const arr = loadRecords();
		if(!recentList) return;
		const top = arr.slice(0,5);
		if(top.length===0){ recentList.innerHTML = '<div class="history-empty">尚無得獎紀錄</div>'; return; }
		recentList.innerHTML = top.map(r=>`<div class="recent-item">${r.prize}${r.big?'<span class="r-badge"> ★</span>':''}</div>`).join('');
	}

	historyToggle.addEventListener('click', ()=>{ historyPanel.style.display = historyPanel.style.display==='none' ? 'block' : 'none'; renderRecords(); });
	closeHistoryBtn.addEventListener('click', ()=>{ historyPanel.style.display='none'; });
	clearHistoryBtn.addEventListener('click', ()=>{ localStorage.removeItem('scratch_records'); renderRecords(); renderRecent(); });


	// 初始化
	pickPrize();
	// 等待 DOM layout
	requestAnimationFrame(()=>{ resizeCanvas(); renderRecent(); });

})();
