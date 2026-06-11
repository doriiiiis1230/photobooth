// app.js
document.addEventListener("DOMContentLoaded", () => {
    const pageType = document.body.dataset.page;

    if (pageType === "frame") {
        initFramePage();
    } else if (pageType === "camera") {
        initCameraPage();
    } else if (pageType === "decorate") {
        initDecoratePage();
    } else if (pageType === "save") {
        initSavePage();
    }
});

// 2. 外框選擇頁
function initFramePage() {
    const frames = document.querySelectorAll(".frame-option");
    frames.forEach(frame => {
        frame.addEventListener("click", () => {
            const frameSrc = frame.dataset.frame;
            localStorage.setItem("selectedFrame", frameSrc);
            window.location.href = "camera.html";
        });
    });
}

// 3. 拍照頁邏輯
async function initCameraPage() {
    const video = document.getElementById("video");
    const overlay = document.getElementById("frame-overlay");
    const captureBtn = document.getElementById("capture-btn");

    const selectedFrame = localStorage.getItem("selectedFrame") || "images/frame1.png";
    overlay.src = selectedFrame;

    overlay.onerror = () => {
        overlay.style.display = 'none';
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: 640, height: 360 } 
        });
        video.srcObject = stream;
    } catch (err) {
        alert("無法開啟相機，請確認您使用的是本地伺服器環境(Live Server)並允許了相機權限！");
        return;
    }

    captureBtn.addEventListener("click", () => {
        // 1. 創建主要畫布（最後輸出的畫布）
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");

        // 2. 🔥【手機版相容性關鍵】創建一個暫時的隱藏畫布，先捕捉純粹、未經濾鏡的視訊畫面
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 640;
        tempCanvas.height = 360;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

        // 3. 在主要畫布上設定你想烘焙進去的辣妹濾鏡配方
        ctx.filter = "brightness(1.18) contrast(1.05) saturate(1.12) hue-rotate(-8deg)";
        
        // 4. 🪞 結合鏡像處理：將這個暫時畫布（已被視為靜態圖）反轉並濾鏡化繪製到主畫布上
        ctx.save();                           // 儲存畫布狀態
        ctx.translate(canvas.width, 0);       // 移至右側
        ctx.scale(-1, 1);                     // 水平翻轉
        
        // 💡 關鍵：改為繪製 tempCanvas 而非 video，手機就能完美吃得到 ctx.filter 濾鏡了！
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height); 
        ctx.restore();                        // 恢復畫布狀態
        
        // 關閉主要畫布的濾鏡，確保接下來疊加的「外框」保持原本漂亮的顏色不被變色
        ctx.filter = "none";
        
        // --- 以下原本載入外框並合成跳頁的邏輯完全不用變 ---
        const selectedFrame = localStorage.getItem("selectedFrame") || "images/frame1.png";
        const frameImg = new Image();
        if (selectedFrame.startsWith('http')) {
            frameImg.crossOrigin = "anonymous"; 
        }
        frameImg.src = selectedFrame;

        const proceedToNextPage = () => {
            localStorage.setItem("capturedPhoto", canvas.toDataURL("image/png"));
            if (video.srcObject) {
                let tracks = video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
            window.location.href = "decorate.html";
        };

        frameImg.onload = () => {
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
            proceedToNextPage();
        };

        frameImg.onerror = () => {
            console.warn("未檢測到外框圖片資源，已自動跳過外框合成。");
            proceedToNextPage();
        };
    });
}

// 4. 裝飾頁邏輯
function initDecoratePage() {
    const workspace = document.getElementById("workspace");
    const bgImg = document.getElementById("captured-img");
    const overlay = document.getElementById("frame-overlay-dec");
    const finishBtn = document.getElementById("finish-btn");
    const stickers = document.querySelectorAll(".sticker-item");

    bgImg.src = localStorage.getItem("capturedPhoto") || "";
    overlay.src = localStorage.getItem("selectedFrame") || "images/frame1.png";

    overlay.onerror = () => overlay.style.display = 'none';

    stickers.forEach(sticker => {
        sticker.addEventListener("click", () => {
            const wrapper = document.createElement("div");
            wrapper.classList.add("draggable-sticker");
            wrapper.style.left = "160px";
            wrapper.style.top = "85px";

            // ✨ 新增：初始化旋轉角度資料集
            wrapper.dataset.angle = "0";

            const newSticker = document.createElement("img");
            newSticker.src = sticker.dataset.src;
            
            const handle = document.createElement("div");
            handle.className = "resize-handle";

            // ✨ 新增：創建旋轉把手節點
            const rotateHandle = document.createElement("div");
            rotateHandle.className = "rotate-handle";

            newSticker.onerror = () => {
                wrapper.innerHTML = "";
                const textFallback = document.createElement("div");
                textFallback.innerText = sticker.innerText || "🧸";
                textFallback.style.color = "#ffff00";
                textFallback.style.fontSize = "1.5rem";
                textFallback.style.fontWeight = "bold";
                wrapper.appendChild(textFallback);
                wrapper.appendChild(handle);
                wrapper.appendChild(rotateHandle); // 文字模式也需要旋轉
            };

            wrapper.appendChild(newSticker);
            wrapper.appendChild(handle);
            wrapper.appendChild(rotateHandle); // 將旋轉把手疊加進外殼
            workspace.appendChild(wrapper);
            
            // 綁定包含旋轉功能的整合互動
            makeElementInteractive(wrapper, handle, rotateHandle);
        });
    });

    // ✨ 升級：完美支援 拖拽 X 縮放 X 旋轉 的三重演算法
    function makeElementInteractive(elmnt, handle, rotateHandle) {
        let isDragging = false;
        let isResizing = false;
        let isRotating = false;
        let startX, startY, startWidth, startHeight, startLeft, startTop;
        let startAngle = 0;

        // A. 點擊縮放鈕
        handle.onpointerdown = function(e) {
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = elmnt.clientWidth;
            startHeight = elmnt.clientHeight;
            handle.setPointerCapture(e.pointerId);
        };

        // B. 點擊旋轉鈕
        rotateHandle.onpointerdown = function(e) {
            e.stopPropagation();
            isRotating = true;
            
            // 抓取貼紙當下的中心點座標
            const rect = elmnt.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            
            // 計算初始滑鼠與中心點夾角角度
            const currentAngleRad = Math.atan2(e.clientY - cy, e.clientX - cx);
            const currentAngleDeg = currentAngleRad * (180 / Math.PI);
            
            // 紀錄滑鼠相對角度與貼紙目前旋轉角度的差值
            startAngle = currentAngleDeg - parseFloat(elmnt.dataset.angle || 0);
            rotateHandle.setPointerCapture(e.pointerId);
        };

        // C. 點擊貼貼紙主體進行拖曳
        elmnt.onpointerdown = function(e) {
            if (isResizing || isRotating) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = elmnt.offsetLeft;
            startTop = elmnt.offsetTop;
            elmnt.setPointerCapture(e.pointerId);
        };

        // D. 全域移動追蹤
        const handlePointerMove = (e) => {
            if (isResizing) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                const newSize = Math.max(30, startWidth + deltaX, startHeight + deltaY);
                elmnt.style.width = newSize + "px";
                elmnt.style.height = newSize + "px";
            } 
            else if (isRotating) {
                // 即時計算貼紙中心點
                const rect = elmnt.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                
                const currentAngleRad = Math.atan2(e.clientY - cy, e.clientX - cx);
                let deg = currentAngleRad * (180 / Math.PI) - startAngle;
                
                // 限制在 0~360 度之間
                deg = (deg % 360 + 360) % 360;

                elmnt.dataset.angle = deg;
                elmnt.style.transform = `rotate(${deg}deg)`;
            }
            else if (isDragging) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                let newTop = startTop + deltaY;
                let newLeft = startLeft + deltaX;

                if (newTop < 0) newTop = 0;
                if (newTop > workspace.clientHeight - elmnt.clientHeight) {
                    newTop = workspace.clientHeight - elmnt.clientHeight;
                }
                if (newLeft < 0) newLeft = 0;
                if (newLeft > workspace.clientWidth - elmnt.clientWidth) {
                    newLeft = workspace.clientWidth - elmnt.clientWidth;
                }

                elmnt.style.top = newTop + "px";
                elmnt.style.left = newLeft + "px";
            }
        };

        elmnt.onpointermove = handlePointerMove;
        handle.onpointermove = handlePointerMove;
        rotateHandle.onpointermove = handlePointerMove;

        // E. 釋放點擊
        const handlePointerUp = (e) => {
            isDragging = false;
            isResizing = false;
            isRotating = false;
        };

        elmnt.onpointerup = handlePointerUp;
        handle.onpointerup = handlePointerUp;
        rotateHandle.onpointerup = handlePointerUp;
    }

    // ✨ 核心升級：合成最終圖片（完美支援旋轉矩陣導出）
    finishBtn.addEventListener("click", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");

        const baseImg = new Image();
        if (bgImg.src.startsWith('http')) {
            baseImg.crossOrigin = "anonymous";
        }
        baseImg.src = bgImg.src;
        baseImg.onload = () => {
            ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

            const scaleX = canvas.width / workspace.clientWidth;
            const scaleY = canvas.height / workspace.clientHeight;
            const placedStickers = workspace.querySelectorAll(".draggable-sticker");
            
            let loadedCount = 0;
            if (placedStickers.length === 0) {
                saveAndGo();
                return;
            }

            placedStickers.forEach(stk => {
                const imgEl = stk.querySelector("img");
                // 抓取網頁上該貼紙被旋轉的角度
                const angle = parseFloat(stk.dataset.angle || 0);
                
                if (!imgEl) {
                    // 【文字備份方案旋轉合成】
                    ctx.save();
                    // 1. 計算貼圖中心在 Canvas 上的精確位置
                    const cx = (stk.offsetLeft + stk.clientWidth / 2) * scaleX;
                    const cy = (stk.offsetTop + stk.clientHeight / 2) * scaleY;
                    // 2. 位移畫布中心到貼紙中心，並旋轉畫布矩陣
                    ctx.translate(cx, cy);
                    ctx.rotate((angle * Math.PI) / 180);

                    ctx.font = "30px Arial";
                    ctx.fillStyle = "#ffff00";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    const text = stk.innerText || "🧸";
                    ctx.fillText(text, 0, 0); // 在當前局部原點繪製
                    ctx.restore();

                    loadedCount++;
                    if (loadedCount === placedStickers.length) saveAndGo();
                } else {
                    // 【圖片貼紙旋轉合成】
                    const img = new Image();
                    if (imgEl.src.startsWith('http')) {
                        img.crossOrigin = "anonymous";
                    }
                    img.src = imgEl.src;
                    img.onload = () => {
                        ctx.save();
                        // 1. 計算貼圖中心在 Canvas 上的精確位置
                        const cx = (stk.offsetLeft + stk.clientWidth / 2) * scaleX;
                        const cy = (stk.offsetTop + stk.clientHeight / 2) * scaleY;
                        // 2. 移動畫布原點至中心，執行旋轉
                        ctx.translate(cx, cy);
                        ctx.rotate((angle * Math.PI) / 180);
                        
                        const w = stk.clientWidth * scaleX;
                        const h = stk.clientHeight * scaleY;
                        // 3. 繪製圖片時，寬高各自減半往回除，確保剛好繞著圖片的正中央旋轉！
                        ctx.drawImage(img, -w / 2, -h / 2, w, h);
                        ctx.restore();

                        loadedCount++;
                        if (loadedCount === placedStickers.length) saveAndGo();
                    };
                    img.onerror = () => {
                        loadedCount++;
                        if (loadedCount === placedStickers.length) saveAndGo();
                    };
                }
            });
        };

        function saveAndGo() {
            localStorage.setItem("finalPhoto", canvas.toDataURL("image/png"));
            window.location.href = "save.html";
        }
    });
}

// 5. 儲存頁
function initSavePage() {
    const resultImg = document.getElementById("result-img");
    const downloadBtn = document.getElementById("download-btn");
    
    const finalData = localStorage.getItem("finalPhoto");
    if (finalData) {
        resultImg.src = finalData;
    }

    downloadBtn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.download = "gyaru-puri.png";
        link.href = resultImg.src;
        link.click();
    });
}
