// Beer details modal handler
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('beerModal');
  const closeBtn = document.querySelector('.modal-close');

  if (!modal) return;

  // Open modal with beer details
  function openBeerModal(beer) {
    if (!beer) return;

    // Determine image source
    const defaultImg = 'img/beer.jpg';
    let src = defaultImg;
    if (beer.imageData) {
      src = beer.imageData;
    } else if (beer.imagePath) {
      src = beer.imagePath;
    } else if (beer.image) {
      src = `https://punkapi.online/v3/images/${beer.image}`;
    }

    // Populate modal fields
    document.getElementById('modalImage').src = src;
    document.getElementById('modalImage').onerror = function() {
      this.src = defaultImg;
    };
    document.getElementById('modalName').textContent = beer.name || 'Bière';
    document.getElementById('modalTagline').textContent = beer.tagline || '';
    document.getElementById('modalDescription').textContent = beer.description || 'Aucune description disponible.';
    document.getElementById('modalAbv').textContent = (beer.abv ?? beer.alcoholContent ?? '-');
    document.getElementById('modalIbu').textContent = (beer.ibu ?? '-');

    modal.style.display = 'flex';
  }

  // Close modal
  function closeModal() {
    modal.style.display = 'none';
  }

  // Close button click
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Expose openBeerModal globally so renderBeer can call it
  window.openBeerModal = openBeerModal;
});
