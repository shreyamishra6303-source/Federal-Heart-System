document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const processingState = document.getElementById('processing-state');
    const messages = document.querySelectorAll('.processing-msg');
    const heartContainer = document.getElementById('heart-container');
    const centralHub = document.getElementById('central-hub');
    const syncBtn = document.getElementById('sync-btn');
    const spinner = document.querySelector('.spinner');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Also handle click to upload (simulate for this demo)
    dropZone.addEventListener('click', () => {
        // Create invisible file input for real functionality
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.style.display = 'none';
        
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                startProcessing();
            }
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            startProcessing();
        }
    }

    function startProcessing() {
        // Fade out drop zone
        dropZone.classList.add('fade-out');
        
        setTimeout(() => {
            // Hide drop zone completely to prevent interaction
            dropZone.style.display = 'none';
            
            // Show processing state
            processingState.classList.remove('hidden');
            
            // Animate texts
            setTimeout(() => {
                messages[0].classList.add('visible'); // First message appears
                
                setTimeout(() => {
                     messages[1].classList.add('visible'); // Second message appears after delay
                     
                     // Fade out spinner and show heart
                     setTimeout(() => {
                         spinner.style.transition = 'opacity 0.5s ease';
                         spinner.style.opacity = '0';
                         setTimeout(() => spinner.style.display = 'none', 500);
                         
                         heartContainer.classList.add('visible');
                     }, 1500);
                }, 1500);
                
            }, 100);
            
        }, 400); // Wait for fade out CSS transition
    }

    if (syncBtn) {
        syncBtn.addEventListener('click', triggerFederatedSync);
    }

    window.triggerFederatedSync = function() {
        // Hide button, text, and spinner fully
        syncBtn.style.transition = 'opacity 0.5s';
        syncBtn.style.opacity = '0';
        syncBtn.style.pointerEvents = 'none';
        
        messages.forEach(msg => {
            msg.style.transition = 'opacity 0.5s';
            msg.style.opacity = '0';
        });
        
        // Show Central Hub
        centralHub.classList.add('visible');
        centralHub.classList.remove('hidden-element'); // override opacity
        
        const heartSvg = document.getElementById('geometric-heart');
        const heartRect = heartSvg.getBoundingClientRect();
        
        const hubIcon = centralHub.querySelector('svg');
        const hubRect = hubIcon.getBoundingClientRect();
        
        // Dissolve heart visually
        heartSvg.style.transition = 'all 0.5s ease-out';
        heartSvg.style.opacity = '0';
        heartSvg.style.transform = 'scale(1.2)';
        
        // Generate particles
        const numParticles = 60;
        
        for (let i = 0; i < numParticles; i++) {
            createParticle(heartRect, hubRect);
        }
    };

    function createParticle(startRect, endRect) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 6 + 2; 
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        const startX = startRect.left + (Math.random() * startRect.width);
        const startY = startRect.top + (Math.random() * startRect.height) - 20;
        
        particle.style.left = `${startX}px`;
        particle.style.top = `${startY}px`;
        
        document.body.appendChild(particle);
        
        const duration = Math.random() * 1000 + 800; // 0.8s to 1.8s
        const delay = Math.random() * 800; // stagger start up to 0.8s
        
        const targetX = endRect.left + endRect.width / 2;
        const targetXAdjustment = targetX - startX;
        
        const targetY = endRect.top + endRect.height / 2;
        const targetYAdjustment = targetY - startY;
        
        const spreadX = (Math.random() - 0.5) * 150;
        const spreadY = (Math.random() - 0.5) * 150;

        particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
            { transform: `translate(${spreadX}px, ${spreadY}px) scale(1.5)`, opacity: 0.8, offset: 0.3 },
            { transform: `translate(${targetXAdjustment}px, ${targetYAdjustment}px) scale(0.2)`, opacity: 0, offset: 1 }
        ], {
            duration: duration,
            delay: delay,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
        });
        
        setTimeout(() => {
            particle.remove();
        }, duration + delay + 100);
    }
});
