document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('beerForm');
    const message = document.getElementById('formMessage');
    const fileInput = document.getElementById('beerImage');
    const preview = document.getElementById('previewImage');

    function showMessage(text, isError = false) {
        if (!message) return;
        message.style.color = isError ? 'crimson' : 'green';
        message.textContent = text;
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Erreur lecture fichier'));
            reader.readAsDataURL(file);
        });
    }

    // preview when selecting an image
    if (fileInput && preview) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) {
                preview.src = '';
                preview.style.display = 'none';
                return;
            }
            try {
                const dataUrl = await readFileAsDataURL(file);
                preview.src = dataUrl;
                preview.style.display = 'block';
            } catch (err) {
                console.error('Preview error', err);
                preview.style.display = 'none';
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('beerName').value.trim();
        const type = document.getElementById('beerType').value.trim();
        const alcoholContent = parseFloat(document.getElementById('alcoholContent').value);
        const brewery = document.getElementById('brewery').value.trim();
        const description = document.getElementById('description').value.trim();
        const file = fileInput && fileInput.files && fileInput.files[0];

        if (!name || !type || isNaN(alcoholContent) || !brewery) {
            showMessage('Veuillez remplir tous les champs requis.', true);
            return;
        }

        const beer = { name, type, alcoholContent, brewery, description };

        // If an image file was provided, read it as DataURL and attach
        try {
            if (file) {
                const dataUrl = await readFileAsDataURL(file);
                beer.imageData = dataUrl; // store data URL for display later
            } else {
                beer.imageData = null;
            }
        } catch (err) {
            console.error('Erreur lecture image:', err);
            showMessage('Impossible de lire l\'image fournie.', true);
            return;
        }

        try {
            if (typeof window.addBeerToDb !== 'function') {
                throw new Error('Fonction addBeerToDb introuvable. Vérifiez que indexDB.js est chargé.');
            }

            await window.addBeerToDb(beer);
            showMessage('Bière ajoutée avec succès.');
            form.reset();
            setTimeout(() => showMessage(''), 3000);
        } catch (err) {
            console.error('Error adding beer:', err);
            showMessage('Échec lors de l\'ajout. Réessayez.', true);
        }
    });
});