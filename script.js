document.addEventListener('DOMContentLoaded', function() {
    const character = document.getElementById('character');
    const area = document.querySelector('.area-container');
    const areaRect = area.getBoundingClientRect();

    // Animation frames for jump
    const jumpFrames = [
        'moves/moves/jump-1.png',
        'moves/moves/jump-2.png',
        'moves/moves/jump-3.png',
        'moves/moves/jump-4.png',
        'moves/moves/jump-5.png',
        'moves/moves/jump-6.png',
        'moves/moves/jump-7.png'
    ];
    const idleFrame = 'moves/moves/idle-1.png';

    // Character size
    const charHeight = character.offsetHeight;
    const charWidth = character.offsetWidth;

    // Platform boundaries
    const platformLeft = areaRect.left;
    const platformRight = areaRect.left + areaRect.width;
    const platformTop = areaRect.top;

    // Position variables
    let left = platformLeft + (areaRect.width / 2) - (charWidth / 2);
    let top = platformTop - charHeight;
    let velocityY = 0;
    let isJumping = false;
    let jumpFrameIndex = 0;
    let jumpInterval = null;
    let gameOver = false;

    character.style.left = left + 'px';
    character.style.top = top + 'px';

    const keys = {};
    const bullets = [];

    function playJumpAnimation() {
        jumpFrameIndex = 0;
        character.src = jumpFrames[jumpFrameIndex];
        jumpInterval = setInterval(() => {
            jumpFrameIndex++;
            if (jumpFrameIndex < jumpFrames.length) {
                character.src = jumpFrames[jumpFrameIndex];
            } else {
                clearInterval(jumpInterval);
                character.src = idleFrame;
            }
        }, 100);
    }

    document.addEventListener('keydown', function(event) {
        if (gameOver && event.code === 'Space') {
            restartGame();
            return;
        }
        if (gameOver) return;
        keys[event.key.toLowerCase()] = true;

        if((event.key === "ArrowUp" || event.key === "w") && !isJumping) {
            isJumping = true;
            velocityY = -15;
            playJumpAnimation();
        }
    });

    document.addEventListener('keyup', function(event) {
        if (gameOver) return;
        keys[event.key.toLowerCase()] = false;
    });

    function animate() {
        if (!gameOver) {
            if (keys["arrowright"] || keys["d"]) left += 10;
            if (keys["arrowleft"] || keys["a"]) left -= 10;

            velocityY += 0.7; // Gravity
            top += velocityY;

            if (
                left + charWidth > platformLeft &&
                left < platformRight &&
                top + charHeight >= platformTop &&
                top + charHeight <= platformTop + 10
            ) {
                top = platformTop - charHeight;
                velocityY = 0;
                isJumping = false;
                character.src = idleFrame;
            } else if (top + charHeight >= window.innerHeight) {
                // 🔹 Trigger death screen if you fall
                endGame();
            }

            character.style.left = left + 'px';
            character.style.top = top + 'px';
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.left += bullet.speedX;
            bullet.top += bullet.speedY;
            bullet.el.style.left = bullet.left + 'px';
            bullet.el.style.top = bullet.top + 'px';

            if (!gameOver && checkCollision(bullet)) {
                endGame();
            }

            if (
                bullet.left < -100 ||
                bullet.left > window.innerWidth + 100 ||
                bullet.top < -100 ||
                bullet.top > window.innerHeight + 100
            ) {
                bullet.el.remove();
                bullets.splice(i, 1);
            }
        }

        requestAnimationFrame(animate);
    }

    animate();

    // ===============================
    // 🔹 BULLET SYSTEM
    // ===============================
    const bulletHorizontal = 'moves/moves/bullet_h.png';
    const bulletVertical = 'moves/moves/bullet_v.png';

    function spawnBullet() {
        if (gameOver) return;

        const bulletImg = document.createElement('img');
        bulletImg.className = 'bullet';
        bulletImg.style.position = 'absolute';
        bulletImg.style.width = '40px';
        bulletImg.style.height = '40px';

        const isHorizontal = Math.random() < 0.5;

        if (isHorizontal) {
            bulletImg.src = bulletHorizontal;
            bulletImg.style.top = (top + charHeight / 2 + (Math.random() * 80 - 40)) + 'px';
            const fromLeft = Math.random() < 0.5;
            if (fromLeft) {
                bulletImg.style.left = '-50px';
                bullets.push({ el: bulletImg, left: -50, top: parseFloat(bulletImg.style.top), speedX: 6, speedY: 0 });
            } else {
                bulletImg.style.left = (window.innerWidth + 50) + 'px';
                bullets.push({ el: bulletImg, left: window.innerWidth + 50, top: parseFloat(bulletImg.style.top), speedX: -6, speedY: 0 });
            }
        } else {
            bulletImg.src = bulletVertical;
            bulletImg.style.left = (left + charWidth / 2 + (Math.random() * 80 - 40)) + 'px';
            const fromTop = Math.random() < 0.5;
            if (fromTop) {
                bulletImg.style.top = '-50px';
                bullets.push({ el: bulletImg, left: parseFloat(bulletImg.style.left), top: -50, speedX: 0, speedY: 6 });
            } else {
                bulletImg.style.top = (window.innerHeight + 50) + 'px';
                bullets.push({ el: bulletImg, left: parseFloat(bulletImg.style.left), top: window.innerHeight + 50, speedX: 0, speedY: -6 });
            }
        }

        document.body.appendChild(bulletImg);
    }

    function checkCollision(bullet) {
        const bulletRect = bullet.el.getBoundingClientRect();
        const charRect = character.getBoundingClientRect();
        return !(
            bulletRect.right < charRect.left ||
            bulletRect.left > charRect.right ||
            bulletRect.bottom < charRect.top ||
            bulletRect.top > charRect.bottom
        );
    }

    function endGame() {
        if (gameOver) return; // avoid triggering twice
        gameOver = true;
        bullets.forEach(b => b.el.remove());
        bullets.length = 0;

        // Dark Souls-style overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 2s ease';
        
        const text = document.createElement('div');
        text.innerText = 'YOU DIED';
        text.style.color = 'red';
        text.style.fontSize = '80px';
        text.style.fontFamily = 'serif';
        text.style.letterSpacing = '5px';
        text.style.marginBottom = '30px';

        const btn = document.createElement('button');
        btn.innerText = 'Restart';
        btn.style.padding = '15px 30px';
        btn.style.fontSize = '20px';
        btn.style.cursor = 'pointer';
        btn.onclick = restartGame;

        overlay.appendChild(text);
        overlay.appendChild(btn);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    }

    function restartGame() {
        location.reload();
    }

    setInterval(spawnBullet, 1200);
});
