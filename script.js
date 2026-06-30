/**
 * AETHER 3D - Modern Weather App & AI Agent Orchestrator
 */

// Application State Management
const state = {
  activeCity: 'Mumbai',
  weatherData: null,
  keys: {
    weather: localStorage.getItem('OWM_API_KEY') || '',
    groq: localStorage.getItem('GROQ_API_KEY') || ''
  },
  chatHistory: [
    {
      role: 'system',
      content: 'You are a weather assistant. Use get_weather function when asked about weather.'
    },
    {
      role: 'assistant',
      content: 'Hello! I am Aura, your intelligent weather agent. Ask me anything about the weather in any city (e.g., "What is the weather in Mumbai?" or "Should I bring an umbrella to London?"). I can dynamically execute weather inquiries using my integrated tools!'
    }
  ]
};

// ==========================================
// 1. UI INITIALIZATION & EVENT HANDLERS
// ==========================================

// Parse and load keys from a local .env configuration file if present
async function loadEnvKeys() {
  try {
    const response = await fetch('/.env');
    if (response.ok) {
      const text = await response.text();
      const lines = text.split('\n');
      let keysUpdated = false;
      
      lines.forEach(line => {
        // Strip comment
        const cleanLine = line.split('#')[0].trim();
        if (!cleanLine) return;
        
        const eqIdx = cleanLine.indexOf('=');
        if (eqIdx > 0) {
          const key = cleanLine.substring(0, eqIdx).trim();
          let val = cleanLine.substring(eqIdx + 1).trim();
          
          // Strip enclosing quotes if present
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          
          if (key === 'WEATHER_API_KEY' && val && val !== 'your_openweathermap_api_key_here') {
            state.keys.weather = val;
            localStorage.setItem('OWM_API_KEY', val);
            keysUpdated = true;
          }
          if (key === 'GROQ_API_KEY' && val && val !== 'your_groq_api_key_here') {
            state.keys.groq = val;
            localStorage.setItem('GROQ_API_KEY', val);
            keysUpdated = true;
          }
        }
      });
      
      if (keysUpdated) {
        console.log('API Keys successfully imported from .env config file.');
      }
    }
  } catch (err) {
    console.warn('Could not read or parse .env file:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Attempt to load credentials from .env first
  await loadEnvKeys();

  // Populate Key Inputs in UI
  document.getElementById('weather-key-input').value = state.keys.weather;
  document.getElementById('groq-key-input').value = state.keys.groq;
  updateStatusIndicators();

  // Primary Event Listeners
  document.getElementById('search-btn').addEventListener('click', handleCitySearch);
  document.getElementById('city-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCitySearch();
  });

  // Modal Settings Drawer Listeners
  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('settings-toggle').addEventListener('click', () => {
    settingsModal.classList.add('active');
  });
  document.getElementById('settings-close').addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });
  document.getElementById('settings-save-btn').addEventListener('click', saveAPIKeys);

  // Toggle Password Visibility
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wrapper = btn.closest('.password-wrapper');
      const input = wrapper.querySelector('input');
      const icon = btn.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye');
      } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye-off');
      }
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // AI Drawer Toggle Listeners
  const aiChatDrawer = document.getElementById('ai-chat-drawer');
  document.getElementById('ai-chat-toggle').addEventListener('click', () => {
    aiChatDrawer.classList.toggle('active');
    setTimeout(scrollToBottom, 200);
  });
  document.getElementById('ai-chat-close').addEventListener('click', () => {
    aiChatDrawer.classList.remove('active');
  });

  // Chat Input Handling
  document.getElementById('chat-send-btn').addEventListener('click', handleUserChatMessage);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserChatMessage();
  });

  // Start Background Particle Canvas
  initBackgroundParticles();

  // Start Three.js Canvas Visuals
  initThreeJSOrb();

  // Run initial city search
  triggerWeatherInquiry(state.activeCity);
  
  // Set up CSS 3D Tilt effect
  setupTiltCards();
});

// Update indicators indicating key availability
function updateStatusIndicators() {
  const wDot = document.getElementById('weather-status-dot');
  const wText = document.getElementById('weather-status-text');
  const gDot = document.getElementById('groq-status-dot');
  const gText = document.getElementById('groq-status-text');
  const aiBadge = document.getElementById('ai-engine-badge');

  if (state.keys.weather) {
    wDot.classList.add('active');
    wText.textContent = 'Connected (Live)';
  } else {
    wDot.classList.remove('active');
    wText.textContent = 'Demo Mode';
  }

  if (state.keys.groq) {
    gDot.classList.add('active');
    gText.textContent = 'Connected (Llama)';
    aiBadge.innerHTML = `<i data-lucide="cpu" class="spinning"></i> Llama-3.3-70B`;
    aiBadge.classList.add('connected');
  } else {
    gDot.classList.remove('active');
    gText.textContent = 'Demo Mode';
    aiBadge.innerHTML = `<i data-lucide="activity"></i> Demo Mode`;
    aiBadge.classList.remove('connected');
  }
  if (window.lucide) window.lucide.createIcons();
}

// Save API Keys to localStorage
function saveAPIKeys() {
  const weatherKey = document.getElementById('weather-key-input').value.trim();
  const groqKey = document.getElementById('groq-key-input').value.trim();

  state.keys.weather = weatherKey;
  state.keys.groq = groqKey;

  localStorage.setItem('OWM_API_KEY', weatherKey);
  localStorage.setItem('GROQ_API_KEY', groqKey);

  updateStatusIndicators();
  document.getElementById('settings-modal').classList.remove('active');
  
  // Re-fetch weather under new settings
  triggerWeatherInquiry(state.activeCity);
}

// Handle Header Search Bar
function handleCitySearch() {
  const searchInput = document.getElementById('city-search-input');
  const city = searchInput.value.trim();
  if (city) {
    triggerWeatherInquiry(city);
    searchInput.value = '';
  }
}

// ==========================================
// 2. WEATHER ENGINE: API + MOCK FALLBACK
// ==========================================

// Perform weather query
async function triggerWeatherInquiry(location) {
  // Update state active city
  state.activeCity = location;
  document.getElementById('display-city').textContent = 'Fetching...';
  
  let data;
  if (state.keys.weather) {
    data = await fetchLiveWeather(location);
  } else {
    data = await generateMockWeather(location);
  }

  state.weatherData = data;
  updateWeatherUI(data);
}

// Fetch live weather data from OpenWeatherMap
async function fetchLiveWeather(location) {
  const apiKey = state.keys.weather;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=metric&appid=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.cod === 200) {
      return data;
    } else {
      console.warn(`OWM Error: ${data.message}. Falling back to demo data.`);
      return generateMockWeather(location, `Error OWM: ${data.message}`);
    }
  } catch (error) {
    console.error('Fetch Weather Error:', error);
    return generateMockWeather(location, 'Network Error');
  }
}

// Hashing helper to generate deterministic pseudo-random values for any city name
function getCitySeed(city) {
  let hash = 0;
  for (let i = 0; i < city.length; i++) {
    hash = city.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Mock Weather engine mimicking the schema structure of OpenWeatherMap
function generateMockWeather(location, note = null) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const seed = getCitySeed(location);
      const tempRange = 40; // Max temp variance
      
      // Seeded base metrics
      const baseTemp = Math.floor((seed % 30)) + (seed % 2 === 0 ? 5 : -10); // Between -10 and 35
      const humidity = 40 + (seed % 55); // 40% to 95%
      const windSpeed = 3 + (seed % 30); // 3 to 33 km/h
      const windDir = seed % 360;
      const pressure = 990 + (seed % 30); // 990 to 1020 hPa
      const visibility = 5 + (seed % 11); // 5km to 16km
      
      // Determine condition string
      let condition = 'clear sky';
      let iconCode = '01d';
      const condVal = seed % 6;
      
      if (baseTemp < 0) {
        condition = 'light snow';
        iconCode = '13d';
      } else if (condVal === 0) {
        condition = 'clear sky';
        iconCode = '01d';
      } else if (condVal === 1) {
        condition = 'few clouds';
        iconCode = '02d';
      } else if (condVal === 2) {
        condition = 'scattered clouds';
        iconCode = '03d';
      } else if (condVal === 3) {
        condition = 'broken clouds';
        iconCode = '04d';
      } else if (condVal === 4) {
        condition = 'moderate rain';
        iconCode = '09d';
      } else {
        condition = 'thunderstorm with heavy rain';
        iconCode = '11d';
      }

      // Format custom output matching OpenWeatherMap
      const output = {
        name: location.charAt(0).toUpperCase() + location.slice(1),
        cod: 200,
        main: {
          temp: parseFloat(baseTemp.toFixed(1)),
          feels_like: parseFloat((baseTemp + (humidity > 70 ? 2 : -2)).toFixed(1)),
          temp_min: parseFloat((baseTemp - (seed % 4) - 1).toFixed(1)),
          temp_max: parseFloat((baseTemp + (seed % 4) + 1).toFixed(1)),
          pressure: pressure,
          humidity: humidity
        },
        wind: {
          speed: parseFloat((windSpeed / 3.6).toFixed(2)), // Convert km/h to m/s
          deg: windDir
        },
        visibility: visibility * 1000, // meters
        weather: [
          {
            description: condition + (note ? ` (Simulated: ${note})` : ' (Simulated Data)'),
            icon: iconCode,
            main: condVal >= 5 ? 'Thunderstorm' : (condVal === 4 ? 'Rain' : (baseTemp < 0 ? 'Snow' : (condVal === 0 ? 'Clear' : 'Clouds')))
          }
        ]
      };
      
      resolve(output);
    }, 150); // Simulate network latency
  });
}

// Map Wind Degree to Text Direction
function getWindDirectionText(deg) {
  const directions = ['North (N)', 'North-East (NE)', 'East (E)', 'South-East (SE)', 'South (S)', 'South-West (SW)', 'West (W)', 'North-West (NW)'];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

// Update the DOM Elements with the loaded weather data
function updateWeatherUI(data) {
  if (!data || data.cod !== 200) return;

  const temp = Math.round(data.main.temp);
  const feelsLike = Math.round(data.main.feels_like);
  const tempMin = Math.round(data.main.temp_min);
  const tempMax = Math.round(data.main.temp_max);
  const description = data.weather[0].description;
  const weatherType = data.weather[0].main; // Thunderstorm, Rain, Snow, Clear, Clouds
  
  // Dashboard Text Displays
  document.getElementById('display-city').textContent = data.name;
  document.getElementById('display-temp').textContent = temp;
  document.getElementById('display-description').textContent = description;
  document.getElementById('display-temp-max').textContent = tempMax + '°';
  document.getElementById('display-temp-min').textContent = tempMin + '°';

  // Details - Wind
  const windKmh = Math.round(data.wind.speed * 3.6);
  document.getElementById('val-wind-speed').textContent = `${windKmh} km/h`;
  document.getElementById('val-wind-dir').textContent = getWindDirectionText(data.wind.deg);
  document.getElementById('compass-needle').style.transform = `translate(-50%, -50%) rotate(${data.wind.deg}deg)`;

  // Details - Humidity
  const humidity = data.main.humidity;
  document.getElementById('val-humidity').textContent = `${humidity}%`;
  document.getElementById('val-humidity-bar').style.width = `${humidity}%`;
  
  let comfortLevel = 'Comfortable';
  if (humidity > 70) comfortLevel = 'Sticky / Muggy';
  else if (humidity < 35) comfortLevel = 'Dry Atmosphere';
  document.getElementById('val-humidity-sub').textContent = comfortLevel;

  // Details - Thermal
  document.getElementById('val-feels-like').textContent = `${feelsLike}°C`;
  let feelsSub = 'Matches ambient temperatures.';
  if (feelsLike > temp) feelsSub = 'Humidity makes it feel warmer.';
  else if (feelsLike < temp) feelsSub = 'Wind-chill makes it feel colder.';
  document.getElementById('val-feels-sub').textContent = feelsSub;

  document.getElementById('val-pressure').textContent = `${data.main.pressure} hPa`;
  document.getElementById('val-visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;

  // Details - Aura
  let aura = 'Balanced';
  let auraDesc = 'Ideal weather parameters.';
  if (weatherType === 'Thunderstorm') {
    aura = 'High Voltage';
    auraDesc = 'Storm electrical charge active.';
  } else if (weatherType === 'Rain') {
    aura = 'Somber / Cozy';
    auraDesc = 'Soothing rainfall vibes.';
  } else if (weatherType === 'Snow') {
    aura = 'Frost / Chill';
    auraDesc = 'Crystalline atmosphere.';
  } else if (temp > 30) {
    aura = 'Energetic Heat';
    auraDesc = 'Intense solar emission.';
  } else if (humidity > 80) {
    aura = 'Dense Mist';
    auraDesc = 'Heavy water-vapor density.';
  }
  document.getElementById('val-aura-status').textContent = aura;
  document.getElementById('val-aura-desc').textContent = auraDesc;

  // Triggers Three.js Visual and Particles updates
  setWeatherTheme(weatherType, temp);
}

// Global hook to transition Visual components
function setWeatherTheme(type, temp) {
  // Update Background Particles Settings
  updateParticleWeather(type);

  // Update Three.js Orb Theme Colors and Behaviors
  updateOrbWeather(type, temp);
}


// ==========================================
// 3. BACKGROUND CANVAS PARTICLE ENGINE (2D)
// ==========================================

let canvas, ctx;
let particles = [];
let weatherTypeSetting = 'Clear';
let animFrameId = null;

function initBackgroundParticles() {
  canvas = document.getElementById('weather-particles-canvas');
  ctx = canvas.getContext('2d');
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Start Render Loop
  if (animFrameId) cancelAnimationFrame(animFrameId);
  tickParticles();
}

function resizeCanvas() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

// Particle Class supporting multiple particle blueprints (Rain, Snow, Sun rays, Mist)
class Particle {
  constructor(type) {
    this.type = type;
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height - canvas.height;
    
    if (this.type === 'Rain') {
      this.length = 15 + Math.random() * 20;
      this.speedY = 10 + Math.random() * 12;
      this.speedX = -2 - Math.random() * 2; // Slanted rain
      this.opacity = 0.15 + Math.random() * 0.25;
      this.width = 1 + Math.random() * 1.5;
    } else if (this.type === 'Snow') {
      this.radius = 1.5 + Math.random() * 3.5;
      this.speedY = 0.5 + Math.random() * 1.5;
      this.speedX = -1 + Math.random() * 2;
      this.opacity = 0.2 + Math.random() * 0.55;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = -0.02 + Math.random() * 0.04;
    } else if (this.type === 'Clouds' || this.type === 'Mist') {
      // Large Horizontal drifting fog puffs
      this.y = Math.random() * canvas.height;
      this.radius = 80 + Math.random() * 150;
      this.speedX = 0.05 + Math.random() * 0.15;
      this.speedY = -0.02 + Math.random() * 0.04;
      this.opacity = 0.01 + Math.random() * 0.035;
      this.x = -this.radius;
    } else {
      // Clear sky floating dust embers / light rays
      this.y = Math.random() * canvas.height;
      this.radius = 1 + Math.random() * 4;
      this.speedY = -0.1 - Math.random() * 0.4;
      this.speedX = -0.3 + Math.random() * 0.6;
      this.opacity = 0.05 + Math.random() * 0.15;
    }
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.type === 'Rain') {
      if (this.y > canvas.height) {
        this.reset();
      }
    } else if (this.type === 'Snow') {
      this.rotation += this.rotationSpeed;
      if (this.y > canvas.height || this.x < 0 || this.x > canvas.width) {
        this.reset();
      }
    } else if (this.type === 'Clouds' || this.type === 'Mist') {
      if (this.x - this.radius > canvas.width) {
        this.reset();
        this.x = -this.radius;
      }
    } else {
      // Clear
      if (this.y < -this.radius || this.x < 0 || this.x > canvas.width) {
        this.reset();
        this.y = canvas.height + this.radius;
      }
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    if (this.type === 'Rain') {
      ctx.strokeStyle = '#4facfe';
      ctx.lineWidth = this.width;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.speedX * 1.5, this.y + this.length);
      ctx.stroke();
    } else if (this.type === 'Snow') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'Clouds' || this.type === 'Mist') {
      // Volumetric mist globule
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Clear warm embers
      ctx.fillStyle = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f2fe';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

// Particle Engine Update handler
function updateParticleWeather(type) {
  weatherTypeSetting = type;
  particles = [];
  
  let particleCount = 60;
  let particleType = 'Clear';
  
  if (type === 'Rain') {
    particleType = 'Rain';
    particleCount = 120;
    document.getElementById('weather-particles-canvas').style.background = 'radial-gradient(circle at 50% 50%, #061120 0%, #010408 100%)';
  } else if (type === 'Thunderstorm') {
    particleType = 'Rain';
    particleCount = 160;
    document.getElementById('weather-particles-canvas').style.background = 'radial-gradient(circle at 50% 50%, #0a041a 0%, #020007 100%)';
  } else if (type === 'Snow') {
    particleType = 'Snow';
    particleCount = 100;
    document.getElementById('weather-particles-canvas').style.background = 'radial-gradient(circle at 50% 50%, #0f1a24 0%, #050a0f 100%)';
  } else if (type === 'Clouds') {
    particleType = 'Clouds';
    particleCount = 20;
    document.getElementById('weather-particles-canvas').style.background = 'radial-gradient(circle at 50% 50%, #0d111a 0%, #04060a 100%)';
  } else {
    // Clear
    particleType = 'Clear';
    particleCount = 40;
    document.getElementById('weather-particles-canvas').style.background = 'radial-gradient(circle at 50% 50%, #0c0828 0%, #030014 100%)';
  }

  // Populate particles array
  for (let i = 0; i < particleCount; i++) {
    const p = new Particle(particleType);
    // Disperse throughout height initially
    p.y = Math.random() * canvas.height;
    particles.push(p);
  }
}

// Canvas Tick Render Loop
function tickParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render Storm lightning flash overlay
  if (weatherTypeSetting === 'Thunderstorm' && Math.random() > 0.985) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.restore();
  }

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
  }
  
  animFrameId = requestAnimationFrame(tickParticles);
}


// ==========================================
// 4. THREE.JS INTERACTIVE WEATHER ORB (3D)
// ==========================================

let orbScene, orbCamera, orbRenderer;
let coreMesh, wireframeMesh, ringSystem1, ringSystem2;
let particlesSystem;
let targetOrbColor = new THREE.Color(0x00f2fe);
let targetRingColor = new THREE.Color(0x4facfe);
let currentOrbColor = new THREE.Color(0x00f2fe);
let currentRingColor = new THREE.Color(0x4facfe);
let orbPulseSpeed = 1.0;
let orbRotationSpeed = 0.5;
let scaleAmplitude = 0.05;
let globalTime = 0;

function initThreeJSOrb() {
  const container = document.getElementById('threejs-orb-container');
  if (!container) return;

  // Scene
  orbScene = new THREE.Scene();

  // Camera
  orbCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  orbCamera.position.z = 8;

  // Renderer
  orbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  orbRenderer.setSize(container.clientWidth, container.clientHeight);
  orbRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(orbRenderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  orbScene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(5, 5, 5);
  orbScene.add(mainLight);

  const glowLight = new THREE.PointLight(0x00f2fe, 2.5, 12);
  glowLight.position.set(0, 0, 0);
  orbScene.add(glowLight);

  // Group to combine all components for easy rotations
  const orbGroup = new THREE.Group();
  orbScene.add(orbGroup);

  // 1. Core Sphere
  const coreGeo = new THREE.IcosahedronGeometry(1.6, 3);
  const coreMat = new THREE.MeshPhongMaterial({
    color: currentOrbColor,
    emissive: currentOrbColor,
    emissiveIntensity: 0.45,
    shininess: 90,
    transparent: true,
    opacity: 0.85,
    flatShading: true
  });
  coreMesh = new THREE.Mesh(coreGeo, coreMat);
  orbGroup.add(coreMesh);

  // 2. Futuristic Wireframe Wrapper
  const wireGeo = new THREE.IcosahedronGeometry(1.62, 2);
  const wireMat = new THREE.MeshBasicMaterial({
    color: currentRingColor,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });
  wireframeMesh = new THREE.Mesh(wireGeo, wireMat);
  orbGroup.add(wireframeMesh);

  // 3. Orbiting Holographic Rings
  const ringGeo1 = new THREE.TorusGeometry(2.3, 0.02, 8, 80);
  const ringMat1 = new THREE.MeshBasicMaterial({
    color: currentRingColor,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });
  ringSystem1 = new THREE.Mesh(ringGeo1, ringMat1);
  ringSystem1.rotation.x = Math.PI / 4;
  ringSystem1.rotation.y = Math.PI / 6;
  orbGroup.add(ringSystem1);

  const ringGeo2 = new THREE.TorusGeometry(2.6, 0.015, 8, 80);
  const ringMat2 = new THREE.MeshBasicMaterial({
    color: currentOrbColor,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide
  });
  ringSystem2 = new THREE.Mesh(ringGeo2, ringMat2);
  ringSystem2.rotation.x = -Math.PI / 3;
  ringSystem2.rotation.y = -Math.PI / 4;
  orbGroup.add(ringSystem2);

  // 4. Surrounding Micro Particles Ring
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    // Generate spherical coordinates
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 2.0 + Math.random() * 0.9;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // Custom particle shader simulation
  const pMat = new THREE.PointsMaterial({
    color: currentRingColor,
    size: 0.035,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  particlesSystem = new THREE.Points(particleGeo, pMat);
  orbGroup.add(particlesSystem);

  // Mouse Interaction drag rotations
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaMove = {
      x: e.clientX - previousMousePosition.x,
      y: e.clientY - previousMousePosition.y
    };

    orbGroup.rotation.y += deltaMove.x * 0.005;
    orbGroup.rotation.x += deltaMove.y * 0.005;

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  // Touch controls
  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });
  window.addEventListener('touchend', () => { isDragging = false; });
  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const deltaMove = {
      x: e.touches[0].clientX - previousMousePosition.x,
      y: e.touches[0].clientY - previousMousePosition.y
    };
    orbGroup.rotation.y += deltaMove.x * 0.008;
    orbGroup.rotation.x += deltaMove.y * 0.008;
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });

  // Render animation Tick
  function animateOrb() {
    requestAnimationFrame(animateOrb);

    globalTime += 0.01 * orbPulseSpeed;

    // Linear interpolation for color transitions
    currentOrbColor.lerp(targetOrbColor, 0.04);
    currentRingColor.lerp(targetRingColor, 0.04);
    
    // Apply interpolated colors to materials
    coreMat.color.copy(currentOrbColor);
    coreMat.emissive.copy(currentOrbColor);
    wireMat.color.copy(currentRingColor);
    ringMat1.color.copy(currentRingColor);
    ringMat2.color.copy(currentOrbColor);
    pMat.color.copy(currentRingColor);
    glowLight.color.copy(currentOrbColor);

    // Auto-rotations
    orbGroup.rotation.y += 0.002 * orbRotationSpeed;
    
    ringSystem1.rotation.z += 0.005 * orbRotationSpeed;
    ringSystem2.rotation.z -= 0.008 * orbRotationSpeed;
    particlesSystem.rotation.y -= 0.003 * orbRotationSpeed;

    // Core Pulse animation
    const scale = 1.0 + Math.sin(globalTime) * scaleAmplitude;
    coreMesh.scale.set(scale, scale, scale);
    wireframeMesh.scale.set(scale * 1.01, scale * 1.01, scale * 1.01);

    orbRenderer.render(orbScene, orbCamera);
  }

  animateOrb();

  // Resize Listener
  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    orbCamera.aspect = w / h;
    orbCamera.updateProjectionMatrix();
    orbRenderer.setSize(w, h);
  });
}

// Modify Orb visual properties dynamically based on weather conditions
function updateOrbWeather(type, temp) {
  // Clear: Warm Sun theme
  if (type === 'Clear') {
    targetOrbColor.setHex(0xf59e0b); // Amber
    targetRingColor.setHex(0xfcd34d); // Yellow
    orbPulseSpeed = 0.8;
    orbRotationSpeed = 0.5;
    scaleAmplitude = 0.04;
  }
  // Clouds: Misty theme
  else if (type === 'Clouds') {
    targetOrbColor.setHex(0x64748b); // Slate Gray
    targetRingColor.setHex(0x94a3b8); // Silver Blue
    orbPulseSpeed = 0.6;
    orbRotationSpeed = 0.3;
    scaleAmplitude = 0.02;
  }
  // Rain: Water dynamic theme
  else if (type === 'Rain') {
    targetOrbColor.setHex(0x3b82f6); // Ocean Blue
    targetRingColor.setHex(0x60a5fa); // Sky Blue
    orbPulseSpeed = 1.4;
    orbRotationSpeed = 1.0;
    scaleAmplitude = 0.06;
  }
  // Storm: Intense purple electricity
  else if (type === 'Thunderstorm') {
    targetOrbColor.setHex(0x7c3aed); // Purple
    targetRingColor.setHex(0x06b6d4); // Electric Cyan
    orbPulseSpeed = 2.2;
    orbRotationSpeed = 2.2;
    scaleAmplitude = 0.12;
  }
  // Snow: Glacial Ice Theme
  else if (type === 'Snow' || temp <= 0) {
    targetOrbColor.setHex(0xe2e8f0); // Ice White
    targetRingColor.setHex(0x38bdf8); // Light Cyan
    orbPulseSpeed = 0.4;
    orbRotationSpeed = 0.2;
    scaleAmplitude = 0.01;
  }
  // Fallback default
  else {
    targetOrbColor.setHex(0x00f2fe);
    targetRingColor.setHex(0x4facfe);
    orbPulseSpeed = 1.0;
    orbRotationSpeed = 0.8;
    scaleAmplitude = 0.05;
  }
}


// ==========================================
// 5. CSS 3D GLASSMOPRHIC TILT CARDS
// ==========================================

function setupTiltCards() {
  const cards = document.querySelectorAll('.tilt-target');
  
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // x coordinate inside element
      const y = e.clientY - rect.top;  // y coordinate inside element
      
      const width = rect.width;
      const height = rect.height;
      
      // Calculate tilt degrees (-10 to 10 degrees)
      const tiltX = ((y / height) - 0.5) * -12;
      const tiltY = ((x / width) - 0.5) * 12;
      
      // Apply card transform inline
      card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0deg)`;
      card.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
    });
    
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.08s ease';
    });
  });
}


// ==========================================
// 6. GROQ-POWERED AI ASSISTANT CLIENT
// ==========================================

// Append messages to the Drawer view
function appendMessage(role, text) {
  const messagesContainer = document.getElementById('chat-messages');
  const msgWrapper = document.createElement('div');
  msgWrapper.className = `message ${role}-message`;
  
  // Format basic markdown style stars **bold** and `code`
  let formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  msgWrapper.innerHTML = `
    <div class="msg-bubble">${formattedText}</div>
  `;
  
  messagesContainer.appendChild(msgWrapper);
  scrollToBottom();
}

function scrollToBottom() {
  const messagesContainer = document.getElementById('chat-messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show/Hide tool-execution indicators
function setToolIndicator(show, text = '') {
  const ind = document.getElementById('tool-indicator');
  const txt = document.getElementById('tool-indicator-text');
  
  if (show) {
    txt.textContent = text;
    ind.classList.remove('hidden');
  } else {
    ind.classList.add('hidden');
  }
  scrollToBottom();
}

// Handle Send button or Enter press
async function handleUserChatMessage() {
  const inputEl = document.getElementById('chat-input');
  const prompt = inputEl.value.trim();
  if (!prompt) return;

  // Append user text to GUI
  appendMessage('user', prompt);
  inputEl.value = '';

  // Append to API prompt list
  state.chatHistory.push({ role: 'user', content: prompt });

  if (state.keys.groq) {
    await runGroqAPIChat(prompt);
  } else {
    await runDemoAIChat(prompt);
  }
}

// Simulated local rule-based AI responder (Demo Mode)
function runDemoAIChat(prompt) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      // Rule parser: Detect city mentions in prompt
      // Search for "in CityName", "for CityName", "weather of CityName"
      const cityRegex = /(?:in|for|weather|of|about)\s+([A-Za-z\s]+)(?:\?|\s|$)/i;
      const match = prompt.match(cityRegex);
      
      let targetCity = null;
      if (match) {
        targetCity = match[1].trim();
      } else {
        // Fallback checks for direct city questions e.g. "Mumbai weather"
        const citiesList = ["Mumbai", "London", "New York", "Tokyo", "Paris", "Berlin", "Sydney", "Rome", "Cairo"];
        for (const c of citiesList) {
          if (prompt.toLowerCase().includes(c.toLowerCase())) {
            targetCity = c;
            break;
          }
        }
      }

      if (targetCity) {
        // Execute simulated tool call!
        const indicatorText = `Executing tool: get_weather("${targetCity}")...`;
        setToolIndicator(true, indicatorText);
        
        let weatherResultString;
        try {
          let weatherRaw;
          if (state.keys.weather) {
            weatherRaw = await fetchLiveWeather(targetCity);
          } else {
            weatherRaw = await generateMockWeather(targetCity);
          }
          
          if (weatherRaw.cod === 200) {
            weatherResultString = JSON.stringify({
              location: weatherRaw.name,
              temperature: weatherRaw.main.temp,
              description: weatherRaw.weather[0].description
            });
            // Auto search main dashboard too for cool sync effect!
            updateWeatherUI(weatherRaw);
          } else {
            weatherResultString = JSON.stringify({ error: `Oops! Couldn't load stats for ${targetCity}.` });
          }
        } catch {
          weatherResultString = JSON.stringify({ error: `Failure querying stats.` });
        }

        // Delay to make tool calling feel real
        setTimeout(() => {
          setToolIndicator(false);
          
          const info = JSON.parse(weatherResultString);
          let responseText;
          if (info.error) {
            responseText = `I attempted to fetch weather using my weather tool, but encountered an error: ${info.error}. Please double-check your city name or configurations!`;
          } else {
            responseText = `I have run the \`get_weather\` tool for **${info.location}**! Current temperature is **${info.temperature}°C** with **${info.description}**. \n\nI have updated your main dashboard visuals. Is there anything else you'd like to check?`;
          }
          
          appendMessage('assistant', responseText);
          state.chatHistory.push({ role: 'assistant', content: responseText });
          resolve();
        }, 1200);

      } else {
        // General query response
        const genericResponse = `I am operating in **Demo Mode**. \n\nTo experience full cognitive intelligence (powered by \`Llama-3.3-70b-versatile\`) and let me parse your prompts with automated tool calling, please provide a Groq API Key in the **Settings Menu** (top-right).\n\n*Tip:* Mention a city in your prompt (e.g., "What is the weather in Paris?") and I will run the simulated tool execution!`;
        appendMessage('assistant', genericResponse);
        state.chatHistory.push({ role: 'assistant', content: genericResponse });
        resolve();
      }
    }, 600);
  });
}

// Live integration calling Groq REST API Endpoint
async function runGroqAPIChat(prompt) {
  const groqKey = state.keys.groq;
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  // Format Weather tools description block matching the Python version
  const tools = [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get current weather for a city",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name like Mumbai, London"
            }
          },
          required: ["location"]
        }
      }
    }
  ];

  try {
    setToolIndicator(true, 'Consulting Aether AI Engine...');

    let response = await callGroqAPI(url, groqKey, state.chatHistory, tools);
    let choice = response.choices[0];
    let responseMessage = choice.message;

    // Check if the LLM requested a tool call
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      const location = args.location;

      setToolIndicator(true, `Running Tool: get_weather("${location}")...`);

      // 1. Run actual weather fetch in JS
      let weatherData;
      if (state.keys.weather) {
        weatherData = await fetchLiveWeather(location);
      } else {
        weatherData = await generateMockWeather(location);
      }

      // Sync the main page UI with this searched city!
      if (weatherData.cod === 200) {
        updateWeatherUI(weatherData);
      }

      // 2. Append LLM response + tool result messages to prompt history
      state.chatHistory.push(responseMessage);
      state.chatHistory.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: "get_weather",
        content: JSON.stringify({
          location: location,
          temperature: weatherData.main ? weatherData.main.temp : 'Unknown',
          description: weatherData.weather ? weatherData.weather[0].description : 'Unknown'
        })
      });

      setToolIndicator(true, 'Synthesizing final response...');

      // 3. Second call to Groq to generate conversation output
      let secondResponse = await callGroqAPI(url, groqKey, state.chatHistory, tools);
      setToolIndicator(false);

      const replyContent = secondResponse.choices[0].message.content;
      appendMessage('assistant', replyContent);
      state.chatHistory.push({ role: 'assistant', content: replyContent });

    } else {
      // Normal text response (no tool was called)
      setToolIndicator(false);
      const replyContent = responseMessage.content;
      appendMessage('assistant', replyContent);
      state.chatHistory.push({ role: 'assistant', content: replyContent });
    }

  } catch (error) {
    console.error('Groq API Error:', error);
    setToolIndicator(false);
    appendMessage('assistant', `Error connecting to Groq AI Server: \`${error.message}\`. Please check your API Key settings.`);
  }
}

// REST helper to POST payload to Groq
async function callGroqAPI(url, apiKey, messages, tools) {
  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: messages,
    tools: tools,
    tool_choice: "auto"
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorDetails}`);
  }

  return await response.json();
}
