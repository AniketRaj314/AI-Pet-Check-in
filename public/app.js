const tama = new Tamagotchi('tama-canvas');

let isProcessing = false;
const RESET_DELAY = 5000;
const isMobile = window.innerWidth <= 600;

const DECODE_W = 960;
const DECODE_H = 540;

const $video = document.getElementById('camera');
const $canvas = document.getElementById('qr-canvas');
$canvas.width = DECODE_W;
$canvas.height = DECODE_H;
const ctx = $canvas.getContext('2d', { willReadFrequently: true });

// --- Robot arm trigger (best-effort, may be blocked by mixed content) ---
const ROBOT_URL = 'https://18a9-106-51-76-129.ngrok-free.app';

function triggerRobot(endpoint) {
  fetch(`${ROBOT_URL}/checkin/${endpoint}`, { method: 'GET' }).catch(() => {});
}

const $backdrop = document.getElementById('backdrop');
const $modal = document.getElementById('modal');
const $modalCard = document.getElementById('modal-card');
const $modalBody = document.getElementById('modal-body');
const $progressBar = document.getElementById('progress-bar');

// --- Camera ---
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: isMobile ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });

  $video.srcObject = stream;
  await $video.play();

  // Mirror on mobile (front/selfie camera)
  if (isMobile) {
    document.body.classList.add('mirrored');
  }

  startScanLoop();
}

// --- QR scan loop using jsQR ---
function startScanLoop() {
  function tick() {
    if (isProcessing) {
      requestAnimationFrame(tick);
      return;
    }

    if ($video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      ctx.drawImage($video, 0, 0, DECODE_W, DECODE_H);
      const imageData = ctx.getImageData(0, 0, DECODE_W, DECODE_H);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data) {
        onScanSuccess(code.data);
        return; // stop loop during processing; resumed after timeout
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// --- Modal ---
function showModal(type, html) {
  $modalCard.className = 'modal-card ' + type;
  $modalBody.innerHTML = html;

  $backdrop.classList.remove('hidden');
  $modal.classList.remove('hidden');

  $progressBar.classList.remove('animate');
  void $progressBar.offsetWidth;
  if (type !== 'loading') {
    $progressBar.style.background =
      type === 'success' ? 'var(--green)' :
      type === 'already' ? 'var(--yellow)' :
      'var(--red)';
    $progressBar.classList.add('animate');
  }
}

function hideModal() {
  $backdrop.classList.add('hidden');
  $modal.classList.add('hidden');
  $progressBar.classList.remove('animate');
}

// --- Check-in ---
async function onScanSuccess(decodedText) {
  if (isProcessing) return;
  isProcessing = true;

  // Immediate feedback — QR detected, checking in
  sfx.scan();
  tama.setState('idle');
  showModal('loading', `
    <h2>QR FOUND</h2>
    <p class="sub-text">Checking you in...</p>
  `);

  try {
    const res = await fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_data: decodedText }),
    });

    const data = await res.json();

    if (data.ok) {
      triggerRobot('yes');
      sfx.success();
      tama.setState('dance');
      showModal('success', `
        <h2>WELCOME!</h2>
        <p class="guest-name">${esc(data.guest_name)}</p>
        <p class="sub-text">Check-in #${data.total_checkins}</p>
      `);
    } else if (data.already_checked_in) {
      triggerRobot('no');
      sfx.already();
      tama.setState('wave');
      showModal('already', `
        <h2>ALREADY IN!</h2>
        <p class="guest-name">${esc(data.guest_name)}</p>
        <p class="sub-text">You're already checked in. Enjoy the workshop!</p>
      `);
    } else {
      triggerRobot('no');
      sfx.error();
      tama.setState('sad');
      showModal('error', `
        <h2>OOPS!</h2>
        <p class="error-text">${esc(data.error || 'Unknown error')}</p>
      `);
    }
  } catch (err) {
    sfx.error();
    tama.setState('sad');
    showModal('error', `
      <h2>OOPS!</h2>
      <p class="error-text">Network error — please try again</p>
    `);
  }

  setTimeout(() => {
    triggerRobot('reset');
    hideModal();
    isProcessing = false;
    tama.setState('idle');
    startScanLoop();
  }, RESET_DELAY);
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// --- Boot ---
startCamera().catch(err => {
  console.error('Camera init failed:', err);
  document.querySelector('.hint').textContent = 'Camera access denied — please allow camera';
});
