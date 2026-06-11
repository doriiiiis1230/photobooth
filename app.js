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
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");

        // 1. 🪞 鏡像翻轉：將視訊畫面水平反轉畫入主畫布中（與畫面預覽保持一致）
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // 2. 🔥【跨平台終極濾鏡烘焙】取出像素，手動套用：brightness(1.4) contrast(1.05) saturate(1.2) hue-rotate(-8deg)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // 預先計算 hue-rotate (-8度) 的色彩旋轉矩陣參數
        const angle = -8 * Math.PI / 180;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        
        const r1 = 0.213 + 0.787 * c - 0.213 * s;
        const g1 = 0.715 - 0.715 * c - 0.715 * s;
        const b1 = 0.072 - 0.072 * c + 0.928 * s;

        const r2 = 0.213 - 0.213 * c + 0.143 * s;
        const g2 = 0.715 + 0.285 * c + 0.140 * s;
        const b2 = 0.072 - 0.072 * c - 0.283 * s;

        const r3 = 0.213 - 0.213 * c - 0.787 * s;
        const g3 = 0.715 - 0.715 * c + 0.715 * s;
        const b3 = 0.072 + 0.928 * c + 0.072 * s;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // A. 亮度提升 (Brightness: 1.4)
            r *= 1.4;
            g *= 1.4;
            b *= 1.4;

            // B. 對比度增強 (Contrast: 1.05)
            r = (r - 128) * 1.05 + 128;
            g = (g - 128) * 1.05 + 128;
            b = (b - 128) * 1.05 + 128;

            // C. 飽和度調整 (Saturate: 1.2)
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = gray + (r - gray) * 1.2;
            g = gray + (g - gray) * 1.2;
            b = gray + (b - gray) * 1.2;

            // D. 色相旋轉 (Hue Rotate: -8deg) 矩陣變換
            const rx = r * r1 + g * g1 + b * b1;
            const gx = r * r2 + g * g2 + b * b2;
            const bx = r * r3 + g * g3 + b * b3;

            // 安全防爆限制：確保數值維持在 0 ~ 255 的合法區間
            data[i]     = Math.min(255, Math.max(0, rx));
            data[i + 1] = Math.min(255, Math.max(0, gx));
            data[i + 2] = Math.min(255, Math.max(0, bx));
        }
        
        // 將處理完畢的完美濾鏡像素資料放回 Canvas
        ctx.putImageData(imgData, 0, 0);
        
        // 3. 疊加拍貼相框（外框不會受到任何像素運算的影響，保持精準原色）
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
