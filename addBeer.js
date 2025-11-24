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
        const DEFAULT_IMAGE = 'img/beer.jpg';
        let objectUrl = null;
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            console.log('fileInput change, file:', file);
            if (!file) {
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    objectUrl = null;
                }
                // show default image when no file selected
                preview.src = DEFAULT_IMAGE;
                preview.style.display = 'block';
                console.log('No file selected — using default preview');
                return;
            }
            try {
                // use object URL for faster preview and less memory usage
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                }
                objectUrl = URL.createObjectURL(file);
                preview.src = objectUrl;
                preview.style.display = 'block';
                console.log('Preview set via objectURL');
            } catch (err) {
                console.error('Preview error', err);
                // fallback to default image
                preview.src = DEFAULT_IMAGE;
                preview.style.display = 'block';
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
                console.log('Reading image file to DataURL...');
                const dataUrl = await readFileAsDataURL(file);
                beer.imageData = dataUrl; // store data URL for display later
                beer.imagePath = null; // no external path, stored inline
                console.log('imageData length:', dataUrl ? dataUrl.length : 0);
            } else {
                // no file selected: use default image path
                beer.imageData = null;
                beer.imagePath = 'img/beer.jpg';
                console.log('No file provided — using default imagePath');
            }
        } catch (err) {
            console.error('Erreur lecture image:', err);
            // if reading fails, fall back to default path
            beer.imageData = null;
            beer.imagePath = 'img/beer.jpg';
            console.warn('Falling back to default imagePath due to read error');
        }

        console.log('Prepared beer object:', beer);

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