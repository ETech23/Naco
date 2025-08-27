// Transition Manager
class TransitionManager {
  constructor() {
    this.isTransitioning = false;
  }

  slideTransition(fromElement, toElement, direction = 'left') {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    fromElement.style.position = 'absolute';
    fromElement.style.width = '100%';
    fromElement.style.top = '0';
    fromElement.style.left = '0';
    
    toElement.style.position = 'absolute';
    toElement.style.width = '100%';
    toElement.style.top = '0';
    toElement.style.left = direction === 'left' ? '100%' : '-100%';
    toElement.style.display = 'block';

    toElement.offsetHeight; // Force reflow

    fromElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    toElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';

    requestAnimationFrame(() => {
      fromElement.style.transform = direction === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
      toElement.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      fromElement.style.display = 'none';
      fromElement.style.position = '';
      fromElement.style.transform = '';
      fromElement.style.transition = '';
      
      toElement.style.position = '';
      toElement.style.transform = '';
      toElement.style.transition = '';
      toElement.style.left = '';
      
      this.isTransitioning = false;
    }, 300);
  }

  modalSlideUp(modalElement) {
    modalElement.style.transform = 'translateY(100%)';
    modalElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    
    requestAnimationFrame(() => {
      modalElement.style.transform = 'translateY(0)';
    });
  }
}

