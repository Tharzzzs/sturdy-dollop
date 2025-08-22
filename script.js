document.addEventListener("DOMContentLoaded", () => {
  const character = document.getElementById("character")
  const area = document.querySelector(".area-container")
  const areaRect = area.getBoundingClientRect()

  // ==========================
  // Game State
  // ==========================
  const gameState = {
    health: 100,
    maxHealth: 100,
    score: 0,
    level: 1,
    combo: 0,
    comboTimer: 0,
    invincible: false,
    invincibilityTimer: 0,
    speedBoost: false,
    speedBoostTimer: 0,
    gameOver: false,
    survivalTime: 0,
  }

  // ==========================
  // Abilities
  // ==========================
  const abilities = {
    dash: { cooldown: 0, maxCooldown: 1000, ready: true },
    shield: { cooldown: 0, maxCooldown: 4000, ready: true, active: false, duration: 0 },
  }

  // UI Elements
  const healthBar = document.getElementById("health-bar")
  const healthText = document.getElementById("health-text")
  const scoreEl = document.getElementById("score")
  const levelEl = document.getElementById("level")
  const comboEl = document.getElementById("combo")
  const comboContainer = document.getElementById("combo-container")
  const dashAbility = document.getElementById("dash-ability")
  const shieldAbility = document.getElementById("shield-ability")
  const dashCooldown = document.getElementById("dash-cooldown")
  const shieldCooldown = document.getElementById("shield-cooldown")

  // ==========================
  // Audio System
  // ==========================
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()

  function playSound(frequency, duration, type = "sine", volume = 0.1) {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    oscillator.type = type

    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)
  }

  // ==========================
  // Particle System
  // ==========================
  function createParticle(x, y, color, size = 5, velocity = { x: 0, y: 0 }, life = 1000) {
    const particle = document.createElement("div")
    particle.className = "particle"
    particle.style.cssText = `
            left: ${x}px; top: ${y}px; width: ${size}px; height: ${size}px;
            background: ${color}; border-radius: 50%; position: absolute;
            pointer-events: none; z-index: 999;
        `

    document.body.appendChild(particle)

    const startTime = Date.now()
    let posX = x,
      posY = y

    function animateParticle() {
      const elapsed = Date.now() - startTime
      const progress = elapsed / life

      if (progress >= 1) {
        particle.remove()
        return
      }

      posX += velocity.x
      posY += velocity.y
      velocity.y += 0.2 // gravity

      const opacity = 1 - progress
      particle.style.left = posX + "px"
      particle.style.top = posY + "px"
      particle.style.opacity = opacity

      requestAnimationFrame(animateParticle)
    }

    animateParticle()
  }

  function createExplosion(x, y, color = "#ff6b6b") {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const velocity = {
        x: Math.cos(angle) * (2 + Math.random() * 3),
        y: Math.sin(angle) * (2 + Math.random() * 3),
      }
      createParticle(x, y, color, 3 + Math.random() * 4, velocity, 800)
    }
  }

  // ==========================
  // Power-up System
  // ==========================
  const powerUps = []

  function spawnPowerUp() {
    if (gameState.gameOver || Math.random() > 0.3) return

    const types = ["health", "invincibility", "speed"]
    const type = types[Math.floor(Math.random() * types.length)]

    const powerUp = document.createElement("div")
    powerUp.className = `power-up ${type}`

    const x = Math.random() * (window.innerWidth - 40)
    const y = Math.random() * (window.innerHeight - 200) + 100

    powerUp.style.left = x + "px"
    powerUp.style.top = y + "px"

    // Add icon based on type
    powerUp.innerHTML = type === "health" ? "❤️" : type === "invincibility" ? "🛡️" : "⚡"

    document.body.appendChild(powerUp)

    powerUps.push({
      element: powerUp,
      type: type,
      x: x,
      y: y,
      collected: false,
    })

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (powerUp.parentNode) {
        powerUp.remove()
        const index = powerUps.findIndex((p) => p.element === powerUp)
        if (index > -1) powerUps.splice(index, 1)
      }
    }, 8000)
  }

  function checkPowerUpCollision() {
    const charRect = character.getBoundingClientRect()

    powerUps.forEach((powerUp, index) => {
      if (powerUp.collected) return

      const puRect = powerUp.element.getBoundingClientRect()

      if (
        !(
          charRect.right < puRect.left ||
          charRect.left > puRect.right ||
          charRect.bottom < puRect.top ||
          charRect.top > puRect.bottom
        )
      ) {
        // Collected!
        powerUp.collected = true
        powerUp.element.remove()
        powerUps.splice(index, 1)

        // Apply effect
        switch (powerUp.type) {
          case "health":
            updateHealth(25)
            playSound(523, 0.2, "sine", 0.15)
            createExplosion(puRect.left + 20, puRect.top + 20, "#ff6b6b")
            break
          case "invincibility":
            gameState.invincible = true
            gameState.invincibilityTimer = 3000
            character.classList.add("character-invincible")
            playSound(659, 0.3, "square", 0.12)
            createExplosion(puRect.left + 20, puRect.top + 20, "#4ecdc4")
            break
          case "speed":
            gameState.speedBoost = true
            gameState.speedBoostTimer = 4000
            playSound(784, 0.25, "sawtooth", 0.1)
            createExplosion(puRect.left + 20, puRect.top + 20, "#feca57")
            break
        }

        gameState.score += 50
        updateUI()
      }
    })
  }

  // ==========================
  // Health System
  // ==========================
  function updateHealth(amount) {
    gameState.health = Math.max(0, Math.min(gameState.maxHealth, gameState.health + amount))

    const percentage = (gameState.health / gameState.maxHealth) * 100
    healthBar.style.width = percentage + "%"
    healthText.textContent = `${gameState.health}/${gameState.maxHealth}`

    // Change health bar color based on health
    if (percentage > 60) {
      healthBar.style.background = "linear-gradient(90deg, #32cd32, #90ee90)"
    } else if (percentage > 30) {
      healthBar.style.background = "linear-gradient(90deg, #ffa500, #ffff00)"
    } else {
      healthBar.style.background = "linear-gradient(90deg, #ff4500, #ff6347)"
    }

    if (gameState.health <= 0) endGame()
  }

  // ==========================
  // Score System
  // ==========================
  function updateScore(points) {
    gameState.score += points
    gameState.level = Math.floor(gameState.score / 500) + 1
    updateUI()
  }

  // ==========================
  // Combo System
  // ==========================
  function updateCombo() {
    gameState.combo++
    gameState.comboTimer = 3000 // 3 seconds to maintain combo

    comboContainer.classList.add("pulse")
    setTimeout(() => comboContainer.classList.remove("pulse"), 200)

    // Bonus points for combo
    const bonusPoints = gameState.combo * 5
    updateScore(bonusPoints)

    updateUI()
    playSound(440 + gameState.combo * 20, 0.1, "sine", 0.08)
  }

  // ==========================
  // UI Update
  // ==========================
  function updateUI() {
    scoreEl.textContent = gameState.score
    levelEl.textContent = gameState.level
    comboEl.textContent = gameState.combo

    // Update ability UI
    dashAbility.classList.toggle("ready", abilities.dash.ready)
    shieldAbility.classList.toggle("ready", abilities.shield.ready)
    shieldAbility.classList.toggle("active", abilities.shield.active)

    const dashProgress = abilities.dash.ready
      ? 100
      : ((abilities.dash.maxCooldown - abilities.dash.cooldown) / abilities.dash.maxCooldown) * 100
    const shieldProgress = abilities.shield.ready
      ? 100
      : ((abilities.shield.maxCooldown - abilities.shield.cooldown) / abilities.shield.maxCooldown) * 100

    dashCooldown.style.width = dashProgress + "%"
    shieldCooldown.style.width = shieldProgress + "%"
  }

  // ==========================
  // Frames
  // ==========================
  const jumpFrames = [
    "moves/moves/jump-1.png",
    "moves/moves/jump-2.png",
    "moves/moves/jump-3.png",
    "moves/moves/jump-4.png",
    "moves/moves/jump-5.png",
    "moves/moves/jump-6.png",
    "moves/moves/jump-7.png",
  ]
  const idleFrame = "moves/moves/idle-1.png"
let currentJumpFrame = 0;

function startJumpAnimation() {
  currentJumpFrame = 0;
  const jumpInterval = setInterval(() => {
    character.src = jumpFrames[currentJumpFrame];
    currentJumpFrame++;

    if (currentJumpFrame >= jumpFrames.length || !isJumping) {
      clearInterval(jumpInterval);
    }
  }, 80); // change every 80ms for smooth animation
}
  // ==========================
  // Position
  // ==========================
  let left = areaRect.left + areaRect.width / 2 - character.offsetWidth / 2
  let top = areaRect.top - character.offsetHeight
  let velocityY = 0,
    isJumping = false

  character.style.left = left + "px"
  character.style.top = top + "px"

  const keys = {},
    bullets = []
  const lastBulletSpawn = 0

  // ==========================
  // Controls
  // ==========================
  document.addEventListener("keydown", (e) => {
    if (gameState.gameOver && e.code === "Space") return restartGame()
    if (gameState.gameOver) return

    keys[e.key.toLowerCase()] = true

    // Jump
    if ((e.key === "ArrowUp" || e.key === "w" || e.key === " ") && !isJumping) {
    isJumping = true;
    velocityY = -15;
    playSound(330, 0.15, "square", 0.1);
    startJumpAnimation();
  }

    // Dash ability
    if (e.key.toLowerCase() === "q" && abilities.dash.ready) {
      abilities.dash.ready = false
      abilities.dash.cooldown = abilities.dash.maxCooldown

      // Dash effect
      const dashDistance = 150
      if (keys["arrowright"] || keys["d"]) {
        left += dashDistance
      } else if (keys["arrowleft"] || keys["a"]) {
        left -= dashDistance
      }

      // Visual effect
      character.style.filter = "brightness(1.5) blur(2px)"
      setTimeout(() => (character.style.filter = ""), 200)

      playSound(880, 0.2, "sawtooth", 0.12)
      createExplosion(left + 50, top + 50, "#00ffff")
    }

    // Shield ability
    if (e.key.toLowerCase() === "e" && abilities.shield.ready) {
      abilities.shield.ready = false
      abilities.shield.cooldown = abilities.shield.maxCooldown
      abilities.shield.active = true
      abilities.shield.duration = 2000

      playSound(523, 0.3, "triangle", 0.1)
    }
  })

  document.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false))

  // ==========================
  // Game Loop
  // ==========================
  function animate() {
    const deltaTime = 16 // Approximate 60fps

    if (!gameState.gameOver) {
      // Movement
      const moveSpeed = gameState.speedBoost ? 15 : 10
      if (keys["arrowright"] || keys["d"]) left += moveSpeed
      if (keys["arrowleft"] || keys["a"]) left -= moveSpeed

      // Physics
      velocityY += 0.7
      top += velocityY

      // Ground collision
      const groundY = areaRect.top - character.offsetHeight
      if (left + character.offsetWidth > areaRect.left && left < areaRect.right && top >= groundY) {
        top = groundY
        velocityY = 0
        isJumping = false
      }

      // Fall death
      if (top > window.innerHeight) endGame()

      // Update timers
      gameState.survivalTime += deltaTime
      gameState.comboTimer = Math.max(0, gameState.comboTimer - deltaTime)
      gameState.invincibilityTimer = Math.max(0, gameState.invincibilityTimer - deltaTime)
      gameState.speedBoostTimer = Math.max(0, gameState.speedBoostTimer - deltaTime)

      // Update abilities
      Object.keys(abilities).forEach((key) => {
        const ability = abilities[key]
        if (!ability.ready) {
          ability.cooldown = Math.max(0, ability.cooldown - deltaTime)
          if (ability.cooldown <= 0) ability.ready = true
        }

        if (ability.duration !== undefined) {
          ability.duration = Math.max(0, ability.duration - deltaTime)
          if (ability.duration <= 0) ability.active = false
        }
      })

      // Reset combo if timer expires
      if (gameState.comboTimer <= 0 && gameState.combo > 0) {
        gameState.combo = 0
        updateUI()
      }

      // Remove status effects
      if (gameState.invincibilityTimer <= 0 && gameState.invincible) {
        gameState.invincible = false
        character.classList.remove("character-invincible")
      }

      if (gameState.speedBoostTimer <= 0) {
        gameState.speedBoost = false
      }

      // Passive score gain
      if (Math.floor(gameState.survivalTime) % 1000 < deltaTime) {
        updateScore(1)
      }

      character.style.left = left + "px"
      character.style.top = top + "px"

      checkPowerUpCollision()
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]
      b.left += b.speedX
      b.top += b.speedY
      b.el.style.left = b.left + "px"
      b.el.style.top = b.top + "px"

      // Collision detection
      if (!gameState.gameOver && !gameState.invincible && !abilities.shield.active && checkCollision(b)) {
        updateHealth(-25)
        playSound(200, 0.3, "sawtooth", 0.15)

        // Screen shake
        document.body.classList.add("screen-shake")
        setTimeout(() => document.body.classList.remove("screen-shake"), 300)

        // Reset combo
        gameState.combo = 0
        updateUI()

        createExplosion(b.left, b.top, "#ff0000")
        b.el.remove()
        bullets.splice(i, 1)
        continue
      }

      // Shield deflection
      if (abilities.shield.active && checkCollision(b)) {
        playSound(660, 0.2, "triangle", 0.12)
        createExplosion(b.left, b.top, "#00ffff")
        updateCombo()
        b.el.remove()
        bullets.splice(i, 1)
        continue
      }

      // Remove off-screen bullets
      if (b.left < -100 || b.left > window.innerWidth + 100 || b.top < -100 || b.top > window.innerHeight + 100) {
        // Award points for dodging
        if (!gameState.gameOver) {
          updateCombo()
        }

        b.el.remove()
        bullets.splice(i, 1)
      }
    }

    updateUI()
    requestAnimationFrame(animate)
  }
  animate()

  // ==========================
  // Bullet System
  // ==========================
  function spawnBullet() {
  if (gameState.gameOver) return

  const bulletImg = document.createElement("img")
  bulletImg.className = "bullet"
  bulletImg.style.position = "absolute"
  bulletImg.style.width = "40px"
  bulletImg.style.height = "40px"

  // use the two bullet PNGs
  const bulletH = "moves/moves/bullet_h.png"
  const bulletV = "moves/moves/bullet_v.png"

  // Progressive difficulty
  const speedMultiplier = 1 + (gameState.level - 1) * 0.2
  const baseSpeed = 6

  if (Math.random() < 0.5) {
    // Horizontal bullet (from left or right)
    const fromLeft = Math.random() < 0.5
    bulletImg.src = bulletH
    const y = Math.random() * window.innerHeight
    const x = fromLeft ? -50 : window.innerWidth + 50
    const speedX = (fromLeft ? 1 : -1) * baseSpeed * speedMultiplier

    bulletImg.style.top = y + "px"
    bulletImg.style.left = x + "px"

    bullets.push({
      el: bulletImg,
      left: x,
      top: y,
      speedX: speedX,
      speedY: 0,
    })
  } else {
    // Vertical bullet (from top)
    bulletImg.src = bulletV
    const x = Math.random() * window.innerWidth
    const y = -50
    const speedY = baseSpeed * speedMultiplier

    bulletImg.style.left = x + "px"
    bulletImg.style.top = y + "px"

    bullets.push({
      el: bulletImg,
      left: x,
      top: y,
      speedX: 0,
      speedY: speedY,
    })
  }

  document.body.appendChild(bulletImg)
}

  function checkCollision(b) {
    const br = b.el.getBoundingClientRect()
    const cr = character.getBoundingClientRect()
    return !(br.right < cr.left || br.left > cr.right || br.bottom < cr.top || br.top > cr.bottom)
  }

  // ==========================
  // End Game
  // ==========================
  function endGame() {
    if (gameState.gameOver) return
    gameState.gameOver = true

    bullets.forEach((b) => b.el.remove())
    bullets.length = 0
    powerUps.forEach((p) => p.element.remove())
    powerUps.length = 0

    playSound(150, 1, "sawtooth", 0.2)

    const overlay = document.createElement("div")
    overlay.className = "game-over-overlay"

    const survivalMinutes = Math.floor(gameState.survivalTime / 60000)
    const survivalSeconds = Math.floor((gameState.survivalTime % 60000) / 1000)

    overlay.innerHTML = `
            <div class="game-over-title">GAME OVER</div>
            <div class="game-stats">
                <h3>Final Statistics</h3>
                <p>Score: ${gameState.score}</p>
                <p>Level Reached: ${gameState.level}</p>
                <p>Max Combo: ${gameState.combo}</p>
                <p>Survival Time: ${survivalMinutes}:${survivalSeconds.toString().padStart(2, "0")}</p>
            </div>
            <button class="restart-btn" onclick="location.reload()">Play Again</button>
        `

    document.body.appendChild(overlay)
  }

  // ==========================
  // Dynamic Spawn Rates
  // ==========================
  function getSpawnInterval() {
    return Math.max(400, 1200 - (gameState.level - 1) * 100)
  }

  // Spawn bullets with dynamic intervals
  function bulletSpawnLoop() {
    if (!gameState.gameOver) {
      spawnBullet()
      setTimeout(bulletSpawnLoop, getSpawnInterval())
    }
  }
  bulletSpawnLoop()

  // Spawn power-ups every 8-15 seconds
  setInterval(spawnPowerUp, 8000 + Math.random() * 7000)

  // Initialize UI
  updateHealth(0)
  updateUI()

  // ==========================
  // Restart Game
  // ==========================
  function restartGame() {
    location.reload()
  }
})
