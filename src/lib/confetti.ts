import confetti from 'canvas-confetti';

export function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ad9377', '#856b59', '#d5c8b5', '#f3efe8', '#bfaa91'],
  });
}

export function fireClaimConfetti() {
  const duration = 800;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#ad9377', '#856b59', '#d5c8b5'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ad9377', '#856b59', '#d5c8b5'],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
