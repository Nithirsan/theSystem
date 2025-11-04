// ============================================
// J.A.R.V.I.S. Interface System - JavaScript
// Navigation, Interactivity & Visualizations
// ============================================

// Page Navigation
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeCharts();
    initializeAnimations();
    initializeInteractivity();
});

// Navigation System
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update active page
            pages.forEach(page => page.classList.remove('active'));
            const targetPageElement = document.getElementById(targetPage);
            if (targetPageElement) {
                targetPageElement.classList.add('active');
                
                // Reinitialize charts when switching pages
                if (targetPage === 'analytics' || targetPage === 'dashboard') {
                    setTimeout(() => {
                        initializeCharts();
                    }, 100);
                }
            }
        });
    });
}

// Chart Initialization
function initializeCharts() {
    // Analytics Chart (Dashboard)
    const analyticsCanvas = document.getElementById('analytics-chart');
    if (analyticsCanvas && document.getElementById('dashboard').classList.contains('active')) {
        drawAnalyticsChart(analyticsCanvas);
    }

    // Performance Chart (Analytics)
    const performanceCanvas = document.getElementById('performance-chart');
    if (performanceCanvas && document.getElementById('analytics').classList.contains('active')) {
        drawPerformanceChart(performanceCanvas);
    }

    // Network Chart (Analytics)
    const networkCanvas = document.getElementById('network-chart');
    if (networkCanvas && document.getElementById('analytics').classList.contains('active')) {
        drawNetworkChart(networkCanvas);
    }

    // Usage Chart (Analytics)
    const usageCanvas = document.getElementById('usage-chart');
    if (usageCanvas && document.getElementById('analytics').classList.contains('active')) {
        drawUsageChart(usageCanvas);
    }

    // Trend Chart (Analytics)
    const trendCanvas = document.getElementById('trend-chart');
    if (trendCanvas && document.getElementById('analytics').classList.contains('active')) {
        drawTrendChart(trendCanvas);
    }

    // Voice Waveform (Messages)
    const voiceCanvas = document.getElementById('voice-canvas');
    if (voiceCanvas && document.getElementById('messages').classList.contains('active')) {
        drawVoiceWaveform(voiceCanvas);
    }
}

// Analytics Chart (Dashboard)
function drawAnalyticsChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    // Generate sample data
    const data = [];
    for (let i = 0; i < 50; i++) {
        data.push(Math.sin(i * 0.2) * 30 + 50 + Math.random() * 20);
    }
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw line
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    
    const stepX = width / (data.length - 1);
    data.forEach((value, index) => {
        const x = index * stepX;
        const y = height - (value / 100) * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw glow effect
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();
}

// Performance Chart (Analytics)
function drawPerformanceChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    // Generate multi-line data
    const datasets = [
        { data: [], color: '#00ffff' },
        { data: [], color: '#00ffcc' },
        { data: [], color: '#0080ff' }
    ];
    
    for (let i = 0; i < 30; i++) {
        datasets[0].data.push(Math.sin(i * 0.3) * 40 + 50);
        datasets[1].data.push(Math.cos(i * 0.3) * 30 + 50);
        datasets[2].data.push(Math.sin(i * 0.2) * 20 + 50);
    }
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw lines
    datasets.forEach((dataset, idx) => {
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = dataset.color;
        ctx.beginPath();
        
        const stepX = width / (dataset.data.length - 1);
        dataset.data.forEach((value, index) => {
            const x = index * stepX;
            const y = height - (value / 100) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
}

// Network Chart (Analytics)
function drawNetworkChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    // Generate area chart data
    const data = [];
    for (let i = 0; i < 40; i++) {
        data.push(Math.sin(i * 0.25) * 35 + 45 + Math.random() * 15);
    }
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw area
    const stepX = width / (data.length - 1);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0.05)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    data.forEach((value, index) => {
        const x = index * stepX;
        const y = height - (value / 100) * height;
        ctx.lineTo(x, y);
    });
    
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = index * stepX;
        const y = height - (value / 100) * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// Usage Chart (Analytics)
function drawUsageChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    // Generate bar chart data
    const data = [];
    for (let i = 0; i < 20; i++) {
        data.push(30 + Math.random() * 50);
    }
    
    const barWidth = width / data.length * 0.6;
    const barSpacing = width / data.length;
    const maxValue = Math.max(...data);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw bars
    data.forEach((value, index) => {
        const x = index * barSpacing + barSpacing * 0.2;
        const barHeight = (value / maxValue) * height * 0.9;
        const y = height - barHeight;
        
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(1, '#00ffcc');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.shadowBlur = 0;
    });
}

// Trend Chart (Analytics - Mini)
function drawTrendChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    // Generate trend data
    const data = [];
    for (let i = 0; i < 15; i++) {
        data.push(Math.sin(i * 0.4) * 20 + 50 + Math.random() * 10);
    }
    
    // Draw line
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#00ff00';
    ctx.beginPath();
    
    const stepX = width / (data.length - 1);
    data.forEach((value, index) => {
        const x = index * stepX;
        const y = height - (value / 100) * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// Voice Waveform (Messages)
function drawVoiceWaveform(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // Animate waveform
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        // Generate waveform data
        const bars = 50;
        const barWidth = width / bars;
        const centerY = height / 2;
        
        for (let i = 0; i < bars; i++) {
            const frequency = 0.1;
            const amplitude = 30 + Math.random() * 20;
            const barHeight = Math.sin((i * frequency) + Date.now() * 0.005) * amplitude;
            
            const x = i * barWidth;
            const y = centerY - barHeight / 2;
            
            const gradient = ctx.createLinearGradient(x, 0, x + barWidth, 0);
            gradient.addColorStop(0, '#00ffff');
            gradient.addColorStop(0.5, '#00ffcc');
            gradient.addColorStop(1, '#00ffff');
            
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#00ffff';
            ctx.fillRect(x, y, barWidth * 0.8, barHeight);
            ctx.shadowBlur = 0;
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Animation Initializations
function initializeAnimations() {
    // Animate stat bars
    animateStatBars();
    
    // Animate progress rings
    animateProgressRings();
    
    // Animate task cards on hover
    setupTaskCardAnimations();
    
    // Animate sliders
    setupSliderAnimations();
}

// Animate Stat Bars
function animateStatBars() {
    const statFills = document.querySelectorAll('.stat-fill');
    statFills.forEach(fill => {
        const width = fill.style.width;
        fill.style.width = '0%';
        setTimeout(() => {
            fill.style.width = width;
        }, 100);
    });
}

// Animate Progress Rings
function animateProgressRings() {
    const progressRings = document.querySelectorAll('.ring-progress');
    progressRings.forEach(ring => {
        const offset = ring.style.strokeDashoffset;
        ring.style.strokeDashoffset = '314';
        setTimeout(() => {
            ring.style.transition = 'stroke-dashoffset 1s ease-out';
            ring.style.strokeDashoffset = offset;
        }, 100);
    });
}

// Setup Task Card Animations
function setupTaskCardAnimations() {
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Setup Slider Animations
function setupSliderAnimations() {
    const sliders = document.querySelectorAll('.holographic-slider');
    
    sliders.forEach(slider => {
        const input = slider.querySelector('.slider-input');
        const fill = slider.querySelector('.slider-fill');
        const handle = slider.querySelector('.slider-handle');
        const value = slider.querySelector('.slider-value');
        
        if (!input || !fill || !handle) return;
        
        // Initialize handle position based on input value
        const initialValue = parseInt(input.value) || 75;
        fill.style.width = initialValue + '%';
        handle.style.left = initialValue + '%';
        if (value) value.textContent = initialValue + '%';
        
        // Update on input change
        input.addEventListener('input', (e) => {
            const percent = e.target.value;
            fill.style.width = percent + '%';
            handle.style.left = percent + '%';
            if (value) value.textContent = percent + '%';
        });
        
        // Update on track click
        const track = slider.querySelector('.slider-track');
        if (track) {
            track.addEventListener('click', (e) => {
                const rect = track.getBoundingClientRect();
                const percent = ((e.clientX - rect.left) / rect.width) * 100;
                const clampedPercent = Math.max(0, Math.min(100, percent));
                
                input.value = clampedPercent;
                fill.style.width = clampedPercent + '%';
                handle.style.left = clampedPercent + '%';
                if (value) value.textContent = Math.round(clampedPercent) + '%';
            });
        }
    });
}

// Interactivity
function initializeInteractivity() {
    // Circular toggles
    setupCircularToggles();
    
    // Security level selector
    setupSecurityLevelSelector();
    
    // Send button
    setupSendButton();
    
    // Message input
    setupMessageInput();
}

// Setup Circular Toggles
function setupCircularToggles() {
    const toggles = document.querySelectorAll('.circular-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
        });
    });
}

// Setup Security Level Selector
function setupSecurityLevelSelector() {
    const options = document.querySelectorAll('.level-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

// Setup Send Button
function setupSendButton() {
    const sendButton = document.querySelector('.send-button');
    const messageInput = document.querySelector('.message-input');
    
    if (sendButton && messageInput) {
        sendButton.addEventListener('click', () => {
            const message = messageInput.value.trim();
            if (message) {
                // Add message to thread (simulated)
                addMessageToThread(message, 'USER');
                messageInput.value = '';
            }
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendButton.click();
            }
        });
    }
}

// Add Message to Thread
function addMessageToThread(text, sender) {
    const thread = document.querySelector('.message-thread');
    if (!thread) return;
    
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender.toLowerCase() === 'user' ? 'received' : 'sent'}`;
    
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    bubble.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${sender}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">
            <p>${text}</p>
        </div>
        <div class="message-glow"></div>
    `;
    
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
    
    // Auto-response from J.A.R.V.I.S. after 1 second
    if (sender === 'USER') {
        setTimeout(() => {
            const responses = [
                'Message received and processed.',
                'Understood. Initiating requested action.',
                'Command acknowledged. Processing...',
                'System response: Action completed successfully.'
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addMessageToThread(randomResponse, 'J.A.R.V.I.S.');
        }, 1000);
    }
}

// Setup Message Input
function setupMessageInput() {
    const messageInput = document.querySelector('.message-input');
    if (messageInput) {
        messageInput.addEventListener('focus', () => {
            messageInput.parentElement.style.borderColor = '#00ffff';
            messageInput.parentElement.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.3)';
        });
        
        messageInput.addEventListener('blur', () => {
            messageInput.parentElement.style.borderColor = 'rgba(0, 255, 255, 0.2)';
            messageInput.parentElement.style.boxShadow = 'none';
        });
    }
}

// Continuous Animations
setInterval(() => {
    // Update live data (simulated)
    updateLiveMetrics();
}, 2000);

// Update Live Metrics
function updateLiveMetrics() {
    const metrics = document.querySelectorAll('.metric-value');
    metrics.forEach(metric => {
        // Add subtle pulse animation
        metric.style.animation = 'none';
        setTimeout(() => {
            metric.style.animation = 'pulse-glow 0.5s ease-in-out';
        }, 10);
    });
}

// Resize Handler
window.addEventListener('resize', () => {
    // Reinitialize charts on resize
    setTimeout(() => {
        initializeCharts();
    }, 100);
});

// Initialize charts when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(() => {
            initializeCharts();
        }, 100);
    }
});

