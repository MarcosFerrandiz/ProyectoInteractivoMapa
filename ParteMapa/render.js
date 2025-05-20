const fs = require('fs');
const path = require('path');

let map;
let markers = [];
let currentMarker;
let searchTimeout;
let ayuntamiento = "";

window.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('ayuntamiento-overlay');
    const btn = document.getElementById('ayuntamiento-btn');
    const input = document.getElementById('ayuntamiento-input');
    const appContent = document.getElementById('app-content');

    btn.addEventListener('click', () => {
        console.log("¡Botón 'Entrar' pulsado!"); 
        const value = input.value.trim();
        if (value.length > 0) {
            ayuntamiento = value.replace(/\s+/g, '').toLowerCase();

            const dir = path.join(__dirname, 'localizaciones');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);

            const filePath = path.join(dir, `markers-${ayuntamiento}.json`);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, "[]");
            }

            overlay.style.display = 'none';
            appContent.style.display = 'block';
            initMap();
        } else {
            input.focus();
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btn.click();
    });
});


const customIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const churchIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/89/89013.png', 
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const monumentIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/4082/4082891.png', 
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const viewpointIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/126/126307.png', 
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const iconTypes = {
    'church': churchIcon,
    'monument': monumentIcon,
    'viewpoint': viewpointIcon
};

function initMap() {
    console.log('Iniciando mapa...');
    try {
        map = L.map('map').setView([40.01, -2.49], 6);
        console.log('Mapa creado');

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        console.log('Capa de tiles añadida');

        let isCreatingMarker = false;

        map.on('click', function(e) {
            if (!isCreatingMarker) { 
                console.log('Click detectado en el mapa:', e.latlng);
                isCreatingMarker = true;
                addMarkerWithName(e.latlng, () => {
                    isCreatingMarker = false; 
                });
            }
        });

        loadMarkers();
        setupSearch();
        setupTabs();

        const menuButton = document.querySelector('.menu-button');
        if (menuButton) {
            menuButton.addEventListener('click', togglePanel);
            console.log('Evento click añadido al botón del menú');
        } else {
            console.error('No se encontró el botón del menú');
        }

        const saveDetailsBtn = document.getElementById('save-details-button');
        if (saveDetailsBtn) {
            saveDetailsBtn.addEventListener('click', saveDetails);
        }
        const cancelDetailsBtn = document.getElementById('cancel-details-button');
        if (cancelDetailsBtn) {
            cancelDetailsBtn.addEventListener('click', hidePanel);
        }

        console.log('Mapa cargado con éxito');
    } catch (error) {
        console.error('Error al inicializar el mapa:', error);
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        clearTimeout(searchTimeout);

        if (query.length < 3) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
                const results = await response.json();
                searchResults.innerHTML = '';
                if (results.length === 0) {
                    searchResults.innerHTML = '<div>No se encontraron resultados</div>';
                } else {
                    results.forEach(result => {
                        const div = document.createElement('div');
                        div.textContent = result.display_name;
                        div.addEventListener('click', () => {
                            map.setView([parseFloat(result.lat), parseFloat(result.lon)], 12);
                            searchResults.classList.add('hidden');
                            searchInput.value = result.display_name;
                        });
                        searchResults.appendChild(div);
                    });
                }
                searchResults.classList.remove('hidden');
            } catch (error) {
                console.error('Error en la búsqueda:', error);
                searchResults.innerHTML = '<div>Error al buscar</div>';
                searchResults.classList.remove('hidden');
            }
        }, 300);
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && searchResults.children.length > 0 && !searchResults.classList.contains('hidden')) {
            const firstResult = searchResults.children[0];
            if (firstResult) firstResult.click();
        }
    });

    document.addEventListener('click', function(e) {
        const searchContainer = document.getElementById('search-container');
        if (searchContainer && !searchContainer.contains(e.target) && searchInput !== e.target) {
            searchResults.classList.add('hidden');
        }
    });
}

function addMarkerWithName(latlng, onComplete) {
    console.log('Iniciando addMarkerWithName con coordenadas:', latlng);
    
    const tempMarker = L.marker(latlng, {
        icon: customIcon,
        draggable: true
    }).addTo(map);
    
    const popupContent = `
        <div class="marker-form">
            <h3 style="margin: 0 0 10px 0; color: #333; text-align: center;">Nueva Ubicación</h3>
            <div style="margin-bottom: 15px;">
                <input type="text" 
                    id="popupMarkerNameInput" 
                    placeholder="Nombre del marcador"
                    style="width: 100%; 
                           padding: 8px; 
                           border: 1px solid #ddd; 
                           border-radius: 4px; 
                           font-size: 14px;">
            </div>
            
            <div class="icon-selector" style="display: grid; 
                                            grid-template-columns: repeat(3, 1fr); 
                                            gap: 10px; 
                                            margin-bottom: 15px;">
                <div class="icon-option selected" 
                     data-icon="church" 
                     style="padding: 8px; 
                            border: 2px solid #e0e0e0; 
                            border-radius: 8px; 
                            cursor: pointer; 
                            text-align: center; 
                            transition: all 0.3s ease;">
                    <img src="https://cdn-icons-png.flaticon.com/512/89/89013.png" 
                         alt="Iglesia" 
                         style="width: 32px; height: 32px; margin-bottom: 5px;">
                    <span style="display: block; font-size: 12px;">Iglesia</span>
                </div>
                <div class="icon-option" 
                     data-icon="monument" 
                     style="padding: 8px; 
                            border: 2px solid #e0e0e0; 
                            border-radius: 8px; 
                            cursor: pointer; 
                            text-align: center; 
                            transition: all 0.3s ease;">
                    <img src="https://cdn-icons-png.flaticon.com/512/4082/4082891.png" 
                         alt="Monumento" 
                         style="width: 32px; height: 32px; margin-bottom: 5px;">
                    <span style="display: block; font-size: 12px;">Monumento</span>
                </div>
                <div class="icon-option" 
                     data-icon="viewpoint" 
                     style="padding: 8px; 
                            border: 2px solid #e0e0e0; 
                            border-radius: 8px; 
                            cursor: pointer; 
                            text-align: center; 
                            transition: all 0.3s ease;">
                    <img src="https://cdn-icons-png.flaticon.com/512/126/126307.png" 
                         alt="Mirador" 
                         style="width: 32px; height: 32px; margin-bottom: 5px;">
                    <span style="display: block; font-size: 12px;">Mirador</span>
                </div>
            </div>
            
            <div class="buttons" style="display: flex; gap: 10px;">
                <button id="popupSaveMarkerButton" 
                        style="flex: 1; 
                               padding: 8px; 
                               background-color: #4CAF50; 
                               color: white; 
                               border: none; 
                               border-radius: 4px; 
                               cursor: pointer; 
                               transition: background-color 0.3s ease;">
                    Guardar
                </button>
                <button id="popupCancelMarkerButton" 
                        style="flex: 1; 
                               padding: 8px; 
                               background-color: #f44336; 
                               color: white; 
                               border: none; 
                               border-radius: 4px; 
                               cursor: pointer; 
                               transition: background-color 0.3s ease;">
                    Cancelar
                </button>
            </div>
        </div>
    `;

    const popup = L.popup({
        closeOnClick: false,
        autoClose: false,
        closeButton: false,
        className: 'custom-popup',
        maxWidth: 300,
        minWidth: 280
    })
    .setLatLng(latlng)
    .setContent(popupContent)
    .openOn(map);

    console.log('Popup creado y abierto');

    const nameInput = document.getElementById('popupMarkerNameInput');
    const saveBtn = document.getElementById('popupSaveMarkerButton');
    const cancelBtn = document.getElementById('popupCancelMarkerButton');
    const iconOptions = document.querySelectorAll('.icon-option');

    if (!nameInput || !saveBtn || !cancelBtn) {
        console.error('No se pudieron encontrar los elementos del popup');
        return;
    }

    let selectedIconType = 'church';

    iconOptions.forEach(option => {
        option.addEventListener('click', function() {
            console.log('Icono seleccionado:', this.getAttribute('data-icon'));
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedIconType = this.getAttribute('data-icon');
        });
    });

    saveBtn.addEventListener('click', () => {
        console.log('Botón guardar clickeado');
        const name = nameInput.value.trim() || 'Punto sin nombre';
        
        const markerData = {
            id: Date.now(),
            lat: latlng.lat,
            lng: latlng.lng,
            name: name,
            description: '',
            question: '',
            iconType: selectedIconType,
            answers: [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
            ]
        };

        console.log('Datos del marcador:', markerData);

        map.removeLayer(tempMarker);

        const selectedIcon = iconTypes[selectedIconType] || customIcon;
        const marker = L.marker([markerData.lat, markerData.lng], {
            icon: selectedIcon,
            draggable: true,
            contextmenu: true,
            contextmenuItems: [{
                text: 'Eliminar marcador',
                callback: function() {
                    if (confirm('¿Estás seguro de que deseas eliminar este marcador?')) {
                        map.removeLayer(marker);
                        markers = markers.filter(m => m.id !== markerData.id);
                        saveMarkers();
                    }
                }
            }]
        }).addTo(map);

        marker.on('contextmenu', function(e) {
            if (confirm('¿Estás seguro de que deseas eliminar este marcador?')) {
                if (currentMarker && currentMarker.data.id === markerData.id) {
                    currentMarker = null;
                    hidePanel();
                }
                map.removeLayer(marker);
                markers = markers.filter(m => m.id !== markerData.id);
                saveMarkers();
            }
        });

        marker.bindPopup(`<b>${name}</b>`);
        
        marker.on('mouseover', function(e) {
            this.openPopup();
        });
        
        marker.on('mouseout', function(e) {
            this.closePopup();
        });
        
        markers.push(markerData);
        
        marker.on('click', () => {
            currentMarker = { marker: marker, data: markerData };
            showPanel(markerData);
        });

        marker.on('dragend', (e) => {
            const newLatLng = e.target.getLatLng();
            markerData.lat = newLatLng.lat;
            markerData.lng = newLatLng.lng;
            saveMarkers();
        });

        saveMarkers();
        map.closePopup();
        if (onComplete) onComplete();
        updateLocationsList(); 
        console.log('Marcador guardado exitosamente');
    });

    cancelBtn.addEventListener('click', () => {
        console.log('Cancelando creación de marcador');
        map.removeLayer(tempMarker);
        map.closePopup();
        if (onComplete) onComplete();
    });

    nameInput.focus();
}

function showPanel(markerData) {
    const panel = document.getElementById('options-panel');
    if (!panel) return;
    panel.classList.remove('hidden');
    
    currentMarker = { 
        marker: findLeafletMarkerById(markerData.id),
        data: markerData 
    };
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    const detailsButton = document.querySelector('.tab-button[data-tab="details"]');
    const detailsContent = document.getElementById('details-tab');
    if (detailsButton && detailsContent) {
        detailsButton.classList.add('active');
        detailsContent.classList.add('active');
    }
    
    document.getElementById('title').value = markerData.name || '';
    document.getElementById('description').value = markerData.description || '';
    document.getElementById('question').value = markerData.question || '';

    const iconSelectorContainer = document.getElementById('details-icon-selector');
    if (iconSelectorContainer) {
        iconSelectorContainer.innerHTML = `
            <div class="icon-option ${markerData.iconType === 'church' ? 'selected' : ''}" data-icon="church">
                <img src="https://cdn-icons-png.flaticon.com/512/89/89013.png" alt="Iglesia" style="width: 32px; height: 32px;">
                <span>Iglesia</span>
            </div>
            <div class="icon-option ${markerData.iconType === 'monument' ? 'selected' : ''}" data-icon="monument">
                <img src="https://cdn-icons-png.flaticon.com/512/4082/4082891.png" alt="Monumento" style="width: 32px; height: 32px;">
                <span>Monumento</span>
            </div>
            <div class="icon-option ${markerData.iconType === 'viewpoint' ? 'selected' : ''}" data-icon="viewpoint">
                <img src="https://cdn-icons-png.flaticon.com/512/126/126307.png" alt="Mirador" style="width: 32px; height: 32px;">
                <span>Mirador</span>
            </div>
        `;
        const iconOptions = iconSelectorContainer.querySelectorAll('.icon-option');
        iconOptions.forEach(option => {
            option.addEventListener('click', function() {
                iconOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                markerData.iconType = this.getAttribute('data-icon');
                
                if (currentMarker && currentMarker.marker) {
                    const newIcon = iconTypes[markerData.iconType] || customIcon;
                    currentMarker.marker.setIcon(newIcon);
                }
            });
        });
    }
    if (markerData.answers && Array.isArray(markerData.answers)) {
        for (let i = 0; i < 4; i++) {
            const answerInput = document.getElementById(`answer${i + 1}`);
            const correctAnswerRadio = document.querySelector(`input[name="correct-answer"][value="${i}"]`);
            
            if (answerInput) {
                answerInput.value = markerData.answers[i] ? (markerData.answers[i].text || '') : '';
            }
            if (correctAnswerRadio) {
                correctAnswerRadio.checked = markerData.answers[i] ? !!markerData.answers[i].isCorrect : false;
            }
        }
    }
}

function saveDetails() {
    if (!currentMarker) return;

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const question = document.getElementById('question').value;
    
    const answers = [];
    for (let i = 0; i < 4; i++) {
        const answerText = document.getElementById(`answer${i + 1}`).value;
        const isCorrect = document.querySelector(`input[name="correct-answer"][value="${i}"]`).checked;
        
        answers.push({
            text: answerText,
            isCorrect: isCorrect
        });
    }

    currentMarker.data.name = title;
    currentMarker.data.description = description;
    currentMarker.data.question = question;
    currentMarker.data.answers = answers;

    const index = markers.findIndex(m => m.id === currentMarker.data.id);
    if (index !== -1) {
        markers[index] = currentMarker.data;
    }

    saveMarkers();
    updateLocationsList();
    hidePanel();
}

function loadMarkers() {
    try {
        console.log('Cargando marcadores para ayuntamiento:', ayuntamiento);
        const dir = path.join(__dirname, 'localizaciones');
        const filePath = path.join(dir, `markers-${ayuntamiento}.json`);
        
        if (fs.existsSync(filePath)) {
            console.log('Archivo de marcadores encontrado:', filePath);
            const data = fs.readFileSync(filePath, 'utf8');
            markers = JSON.parse(data);
            
            console.log('Marcadores cargados del JSON:', markers.length);
            
            markers.forEach(markerData => {
                console.log('Creando marcador:', markerData.name);
                
                const selectedIcon = iconTypes[markerData.iconType] || customIcon;
                const marker = L.marker([markerData.lat, markerData.lng], {
                    icon: selectedIcon,
                    draggable: true
                }).addTo(map);

                marker.on('contextmenu', function(e) {
                    if (confirm('¿Estás seguro de que deseas eliminar este marcador?')) {
                        map.removeLayer(marker);
                        markers = markers.filter(m => m.id !== markerData.id);
                        saveMarkers();
                    }
                });

                marker.bindPopup(`<b>${markerData.name}</b>`);
                
                marker.on('mouseover', function(e) {
                    this.openPopup();
                });
                
                marker.on('mouseout', function(e) {
                    this.closePopup();
                });
                
                marker.on('click', () => {
                    currentMarker = { marker: marker, data: markerData };
                    showPanel(markerData);
                });

                marker.on('dragend', (e) => {
                    const newLatLng = e.target.getLatLng();
                    markerData.lat = newLatLng.lat;
                    markerData.lng = newLatLng.lng;
                    saveMarkers();
                });
            });
            
            updateLocationsList();
            console.log('Marcadores cargados y mostrados en el mapa');
        } else {
            console.log('No se encontró archivo de marcadores para:', ayuntamiento);
            markers = [];
        }
    } catch (error) {
        console.error('Error al cargar marcadores:', error);
        markers = [];
    }
}

function removeMarker(leafletMarkerInstance, markerData) {
    try {
        if (currentMarker && currentMarker.data.id === markerData.id) {
            currentMarker = null;
            hidePanel(); 
        }
        
        map.removeLayer(leafletMarkerInstance);
        markers = markers.filter(m => m.id !== markerData.id); 
        console.log('Marcador eliminado:', markerData.name);
        
        if (document.getElementById('locations-tab').classList.contains('active')) {
            updateLocationsList();
        }
        
        saveMarkers();
        
    } catch (error) {
        console.error('Error al eliminar marcador:', error);
    }
}

function hidePanel() {
    const panel = document.getElementById('options-panel');
    if (panel) {
        panel.style.left = '-100%';
        panel.classList.remove('visible');
    }
}

function removeMarker(leafletMarkerInstance, markerData) {
    try {
        map.removeLayer(leafletMarkerInstance);
        markers = markers.filter(m => m.id !== markerData.id); 
        console.log('Marcador eliminado:', markerData.name);
        
        if (document.getElementById('locations-tab').classList.contains('active')) {
            updateLocationsList();
        }
        saveMarkers();

        if (currentMarker && currentMarker.data && currentMarker.data.id === markerData.id) {
            currentMarker = null;
            hidePanel();
        }
    } catch (error) {
        console.error('Error al eliminar marcador:', error);
    }
}

function saveMarkers() {
    const localizacionesDir = path.join(__dirname, 'localizaciones');
    const ayuntamientoFilePath = path.join(localizacionesDir, `markers-${ayuntamiento}.json`);
    const todosFilePath = path.join(localizacionesDir, 'markers-todos.json');

    try {
        fs.writeFileSync(ayuntamientoFilePath, JSON.stringify(markers, null, 2));
        console.log('Marcadores guardados en:', ayuntamientoFilePath);
    } catch (error) {
        console.error(`Error al guardar marcadores en ${ayuntamientoFilePath}:`, error);
    }

    try {
        const allAyuntamientoFiles = fs.readdirSync(localizacionesDir)
            .filter(file => file.startsWith('markers-') && file.endsWith('.json') && file !== 'markers-todos.json');

        let combinedMarkers = [];
        const uniqueMarkerIds = new Set();


        markers.forEach(marker => {
            if (!uniqueMarkerIds.has(marker.id)) {
                combinedMarkers.push(marker);
                uniqueMarkerIds.add(marker.id);
            }
        });
        
        allAyuntamientoFiles.forEach(file => {

            if (file === `markers-${ayuntamiento}.json`) {

                return; 
            }

            const filePath = path.join(localizacionesDir, file);
            try {
                const fileData = fs.readFileSync(filePath, 'utf8');
                if (fileData.trim() !== "") {
                    const aytoMarkersFromFile = JSON.parse(fileData);
                    if (Array.isArray(aytoMarkersFromFile)) {
                        aytoMarkersFromFile.forEach(marker => {
                            if (!uniqueMarkerIds.has(marker.id)) {
                                combinedMarkers.push(marker);
                                uniqueMarkerIds.add(marker.id);
                            }
                        });
                    }
                }
            } catch (readError) {
                console.error(`Error al leer o parsear ${filePath} para la reconstrucción de markers-todos.json:`, readError);
            }
        });
        
        fs.writeFileSync(todosFilePath, JSON.stringify(combinedMarkers, null, 2));
        console.log('Archivo general markers-todos.json reconstruido y guardado.');

    } catch (error) {
        console.error(`Error al actualizar ${todosFilePath}:`, error);
    }
    

}

function findLeafletMarkerById(id) {
    let foundMarker = null;
    map.eachLayer(function (layer) {
        if (layer.options && layer.options.markerId === id) {
            foundMarker = layer;
        }
    });
    return foundMarker;
}

function deleteCurrentMarker() {
    if (!currentMarker || !currentMarker.data || !currentMarker.data.id) {
        console.error('No current marker selected or marker has no ID.');
        return;
    }

    const markerIdToDelete = currentMarker.data.id;

    if (!confirm(`¿Estás seguro de que quieres eliminar el marcador "${currentMarker.data.name || 'seleccionado'}"?`)) {
        return;
    }

    const leafletMarkerInstance = findLeafletMarkerById(markerIdToDelete);
    if (leafletMarkerInstance) {
        map.removeLayer(leafletMarkerInstance);
        console.log('Leaflet marker removed from map:', markerIdToDelete);
    } else if (currentMarker.marker) {
        map.removeLayer(currentMarker.marker);
        console.log('Fallback: Leaflet marker removed from map via currentMarker.marker:', markerIdToDelete);
    } else {
        console.warn('Could not find Leaflet marker instance on map for ID:', markerIdToDelete);
    }

    const initialLength = markers.length;
    markers = markers.filter(markerData => markerData.id !== markerIdToDelete);

    if (markers.length < initialLength) {
        console.log('Marker data removed from markers array:', markerIdToDelete);
        
        saveMarkers(); 

        hidePanel(); 
        updateLocationsList(); 

        currentMarker = null; 
        console.log('Marcador eliminado y cambios guardados.');
    } else {
        console.error('Error: No se encontró el marcador con ID', markerIdToDelete, 'en el array de marcadores.');
    }
}



function saveDetails() {
    if (!currentMarker) return;

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const question = document.getElementById('question').value;
    
    const answers = [];
    for (let i = 0; i < 4; i++) {
        const answerText = document.getElementById(`answer${i + 1}`).value;
        answers.push({ text: answerText, isCorrect: (i === 0) });
    }

    currentMarker.data.name = title;
    currentMarker.data.description = description;
    currentMarker.data.question = question;
    currentMarker.data.answers = answers; 

    const selectedIconOption = document.querySelector('#details-icon-selector .icon-option.selected');
    if (selectedIconOption) {
        const newIconType = selectedIconOption.getAttribute('data-icon');
        if (newIconType && currentMarker.data.iconType !== newIconType) {
            currentMarker.data.iconType = newIconType;
            if (currentMarker.marker) {
                const newIcon = iconTypes[newIconType] || customIcon;
                currentMarker.marker.setIcon(newIcon);
            }
        }
    }
    
    if (currentMarker.marker && currentMarker.marker.getPopup()) {
        currentMarker.marker.setPopupContent(`<b>${title}</b>`);
    } else if (currentMarker.marker) {
        currentMarker.marker.bindPopup(`<b>${title}</b>`);
    }

    saveMarkers();
    hidePanel();
    updateLocationsList(); 
    console.log('Detalles guardados:', currentMarker.data);
}

function hidePanel() {
    const panel = document.getElementById('options-panel');
    if (panel) {
        panel.style.left = '-100%';
        panel.classList.remove('visible');
    }
}

function removeMarker(leafletMarkerInstance, markerData) {
    try {
        map.removeLayer(leafletMarkerInstance);
        markers = markers.filter(m => m.id !== markerData.id); 
        console.log('Marcador eliminado:', markerData.name);
        
        if (document.getElementById('locations-tab').classList.contains('active')) {
            updateLocationsList();
        }
        saveMarkers();

        if (currentMarker && currentMarker.data && currentMarker.data.id === markerData.id) {
            currentMarker = null;
            hidePanel();
        }
    } catch (error) {
        console.error('Error al eliminar marcador:', error);
    }
}

function saveMarkers() {
    try {
        const dir = path.join(__dirname, 'localizaciones');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);

        const markerFilePath = path.join(dir, `markers-${ayuntamiento}.json`);
        fs.writeFileSync(markerFilePath, JSON.stringify(markers, null, 2));

        const allMarkersPath = path.join(dir, 'markers-todos.json');
        
        let allMarkers = [];
        try {
            const existingMarkers = fs.readFileSync(allMarkersPath, 'utf8');
            allMarkers = JSON.parse(existingMarkers);
            allMarkers = allMarkers.filter(marker => 
                !markers.some(m => m.id === marker.id)
            );
        } catch (error) {
            console.error('Error al leer markers-todos.json:', error);
        }

        allMarkers = [...allMarkers, ...markers];
        fs.writeFileSync(allMarkersPath, JSON.stringify(allMarkers, null, 2));

        localStorage.setItem('markers', JSON.stringify(markers));

        const { exec } = require('child_process');
        const commands = [
            'git add localizaciones/*.json',
            'git commit -m "Actualización automática de marcadores"',
            'git push origin main'
        ];

        let currentCommandIndex = 0;
        
        function executeNextCommand() {
            if (currentCommandIndex < commands.length) {
                const command = commands[currentCommandIndex];
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error ejecutando ${command}:`, error);
                        return;
                    }
                    console.log(`Éxito ejecutando ${command}:`, stdout);
                    currentCommandIndex++;
                    executeNextCommand(); 
                });
            }
        }

        executeNextCommand();

    } catch (err) {
        console.error('Error al guardar marcadores:', err);
    }
}

function togglePanel() {
    const panel = document.getElementById('options-panel');
    if (panel) {
        if (panel.style.left === '0px' || panel.style.left === '') {
            panel.style.left = '-100%';
        } else {
            panel.style.left = '0px';
        }
    }
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });
}

function updateLocationsList() {
    const locationsList = document.getElementById('locations-list');
    if (!locationsList) {
        console.error('No se encontró el elemento locations-list');
        return;
    }

    locationsList.innerHTML = '';
    
    if (markers.length === 0) {
        locationsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No hay ubicaciones guardadas</div>';
        return;
    }
    
    markers.forEach(markerData => {
        const li = document.createElement('li');
        li.className = 'location-item';
        
        const iconUrl = iconTypes[markerData.iconType] ? 
            iconTypes[markerData.iconType].options.iconUrl : 
            customIcon.options.iconUrl;
        
        li.innerHTML = `
            <img src="${iconUrl}" alt="${markerData.name}">
            <div class="location-info">
                <div class="location-name">${markerData.name}</div>
                <div class="location-coordinates">
                    ${markerData.lat.toFixed(4)}, ${markerData.lng.toFixed(4)}
                </div>
            </div>
            <button class="delete-location">Eliminar</button>
        `;
        
        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-location')) {
                map.setView([markerData.lat, markerData.lng], 16);
                const marker = findLeafletMarkerById(markerData.id);
                if (marker) {
                    marker.openPopup();
                }
                showPanel(markerData);
            }
        });

        const deleteBtn = li.querySelector('.delete-location');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Estás seguro de que deseas eliminar este marcador?')) {
                const markerToRemove = findLeafletMarkerById(markerData.id);
                if (markerToRemove) {
                    map.removeLayer(markerToRemove);
                }
                
                if (currentMarker && currentMarker.data.id === markerData.id) {
                    currentMarker = null;
                    hidePanel();
                }
                
                markers = markers.filter(m => m.id !== markerData.id);
                saveMarkers();
                updateLocationsList();
                
            }
        });

        locationsList.appendChild(li);
    });
}