let map;
let userLocation;
let userMarker; 
let accuracyCircle; 
let allMarkersData = []; 
let displayedMarkersLayer;

const INTERACTION_RADIUS_METERS = 50; 


const iconTypes = {
    church: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/89/89013.png',
        iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
    }),
    monument: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/4082/4082891.png',
        iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
    }),
    viewpoint: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/126/126307.png',
        iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
    }),
    default: L.icon({ 
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    })
};

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([40.416775, -3.703790], 6); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    displayedMarkersLayer = L.layerGroup().addTo(map);

    map.locate({ watch: true, setView: false, enableHighAccuracy: true });

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    fetchMarkers(); 

    const closeModalButton = document.getElementById('closeModalButton');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideQuestionModal);
    }
    const questionModalOverlay = document.getElementById('questionModal');
    if (questionModalOverlay) {
        questionModalOverlay.addEventListener('click', function(event) {
            if (event.target === questionModalOverlay) { 
                hideQuestionModal();
            }
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('Página visible, actualizando marcadores desde ParteMovil/map.js...');
            fetchMarkers(); 
        }
    });
});

function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array]; 

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [newArray[currentIndex], newArray[randomIndex]] = [
            newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
}

function onLocationFound(e) {
    userLocation = e.latlng;
    const newRadius = 2000; 

    if (!userMarker) { 
        map.setView(userLocation, 13); 

        userMarker = L.marker(userLocation, { icon: iconTypes.default })
            .addTo(map)
            .bindPopup("¡Estás aquí!")
            .openPopup();

        accuracyCircle = L.circle(userLocation, {
            radius: newRadius,
            weight: 1,
            color: 'blue', 
            fillColor: '#3388ff', 
            fillOpacity: 0.1 
        }).addTo(map);
    } else { 
        userMarker.setLatLng(userLocation);
        accuracyCircle.setLatLng(userLocation).setRadius(newRadius);
    }

    console.log('Ubicación actualizada:', userLocation);
    if (allMarkersData.length > 0) {
        console.log('Ubicación actualizada y marcadores cargados, llamando a displayNearbyMarkers.');
        displayNearbyMarkers();
    } else {
        console.log('Ubicación actualizada, pero esperando a que se carguen los marcadores.');
    }
}

function onLocationError(e) {
    console.error("Error al obtener la ubicación: " + e.message);
    alert("No se pudo obtener tu ubicación. Se mostrará una vista general. Asegúrate de dar permisos de ubicación.");
    displayNearbyMarkers(); 
}

function fetchMarkers() {
    const jsonUrl = 'https://raw.githubusercontent.com/emanol/ProyectoFinalMapa/main/ParteMapa/localizaciones/markers-todos.json';
    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                console.error('Error: markers-todos.json no contiene un array.', data);
                allMarkersData = [];
                alert('El archivo de puntos de interés no tiene el formato esperado.');
            } else {
                allMarkersData = data;
            }
            console.log('Marcadores cargados desde JSON:', allMarkersData.length, '(ParteMovil/map.js)');
            if (userLocation) {
                console.log('Marcadores cargados y ubicación ya disponible, llamando a displayNearbyMarkers desde fetchMarkers (ParteMovil/map.js).');
                displayNearbyMarkers();
            } else {
                console.log('Marcadores cargados, pero esperando la ubicación del usuario (ParteMovil/map.js).');
            }
        })
        .catch(error => {
            console.error('Error al cargar markers-todos.json (ParteMovil/map.js):', error);
            alert('No se pudieron cargar los puntos de interés. Revisa la consola para más detalles.');
        });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function showQuestionModal(markerData) {
    const modal = document.getElementById('questionModal');
    const markerNameEl = document.getElementById('modalMarkerName');
    const questionTextEl = document.getElementById('modalQuestionText');
    const answersContainerEl = document.getElementById('modalAnswersContainer');
    const resultTextEl = document.getElementById('modalResultText');

    if (!modal || !questionTextEl || !answersContainerEl || !markerNameEl || !resultTextEl) {
        console.error('Elementos del modal no encontrados en el DOM.');
        return;
    }
    
    console.log("showQuestionModal: markerData recibido:", JSON.parse(JSON.stringify(markerData))); 
    if (!markerData || !markerData.answers || !Array.isArray(markerData.answers)) {
        console.error("showQuestionModal: markerData.answers falta o no es un array!", markerData);
        resultTextEl.textContent = 'Error: Datos de pregunta inválidos.';
        resultTextEl.style.color = 'red';
        if(modal) modal.classList.add('visible');
        return;
    }

    markerNameEl.textContent = markerData.name || 'Punto de Interés';
    questionTextEl.textContent = markerData.question;
    answersContainerEl.innerHTML = ''; 
    resultTextEl.textContent = ''; 
    resultTextEl.style.color = ''; 

    const shuffledAnswers = shuffleArray(markerData.answers);
    const answerButtonColors = ['color-0', 'color-1', 'color-2', 'color-3']; 

    shuffledAnswers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.classList.add('answer-button');
        button.classList.add(answerButtonColors[index % answerButtonColors.length]); 
        button.textContent = answer.text;

        const originalIsCorrect = answer.isCorrect;
        const typeOfOriginalIsCorrect = typeof originalIsCorrect;
        const stringifiedIsCorrectNormalized = String(originalIsCorrect).trim().toLowerCase();
        const isDataSetGoingToBeTrue = stringifiedIsCorrectNormalized === 'true';

        console.log(`Respuesta: "${answer.text}"
          Original isCorrect: ${originalIsCorrect} (Tipo: ${typeOfOriginalIsCorrect})
          Stringified/Normalized: "${stringifiedIsCorrectNormalized}"
          Dataset será 'true'?: ${isDataSetGoingToBeTrue}`);
        
        button.dataset.isCorrect = stringifiedIsCorrectNormalized;

        button.onclick = function() {
            const allButtons = answersContainerEl.querySelectorAll('.answer-button');
            allButtons.forEach(btn => {
                btn.disabled = true; 
                if (btn.dataset.isCorrect === 'true') {
                    btn.classList.add('correct-answer');
                }
            });

            console.log(`Botón pulsado: Texto='${this.textContent}', dataset.isCorrect='${this.dataset.isCorrect}'`);

            if (this.dataset.isCorrect === 'true') {
                resultTextEl.textContent = '¡Correcto!';
                resultTextEl.style.color = '#27ae60'; 
            } else {
                resultTextEl.textContent = 'Incorrecto';
                resultTextEl.style.color = '#c0392b'; 
                this.classList.add('incorrect-answer'); 
            }
        };
        answersContainerEl.appendChild(button);
    });

    modal.classList.add('visible');
}

function hideQuestionModal() {
    const modal = document.getElementById('questionModal');
    if (modal) {
        modal.classList.remove('visible');
    }
}


function displayNearbyMarkers() {
    console.log('Ejecutando displayNearbyMarkers...');
    if (!displayedMarkersLayer) {
        console.error("displayedMarkersLayer no está inicializado.");
        return;
    }
    displayedMarkersLayer.clearLayers(); 

    const radiusKmToShowMarkers = 2; 
    console.log(`Radio para mostrar marcadores en el mapa: ${radiusKmToShowMarkers} km`);

    if (!allMarkersData || allMarkersData.length === 0) {
        console.log("No hay datos de marcadores globales para mostrar (allMarkersData está vacío o no definido).");
        return;
    }
    console.log(`Total de marcadores en allMarkersData: ${allMarkersData.length}`);

    if (!userLocation) {
        console.log("Ubicación del usuario (userLocation) no está disponible. No se pueden filtrar marcadores por cercanía.");
        return;
    }
    console.log(`Ubicación del usuario: Lat ${userLocation.lat}, Lng ${userLocation.lng}`);

    let markersShownCount = 0;
    allMarkersData.forEach(markerData => {
        if (typeof markerData.lat !== 'number' || typeof markerData.lng !== 'number') {
            console.warn('Marcador con datos de lat/lng inválidos:', markerData);
            return; 
        }

        const distanceToMarker = calculateDistance(
            userLocation.lat, userLocation.lng,
            markerData.lat, markerData.lng
        );
        
        console.log(`Marcador: "${markerData.name || 'Sin nombre'}" (ID: ${markerData.id || 'N/A'}) - Distancia para visualización: ${distanceToMarker.toFixed(2)} km`);

        if (distanceToMarker <= radiusKmToShowMarkers) {
            console.log(`-> MOSTRANDO EN MAPA: "${markerData.name}" porque está a ${distanceToMarker.toFixed(2)} km (dentro del radio de visualización de ${radiusKmToShowMarkers} km).`);
            
            const icon = iconTypes[markerData.iconType] || iconTypes.default;
            const marker = L.marker([markerData.lat, markerData.lng], { icon: icon });
            
            marker.customData = markerData;

            marker.on('click', function() {
                const clickedMarkerData = this.customData;
                let popupContent = ''; 

                if (userLocation) {
                    const distanceUserToClickedMarkerKm = calculateDistance(
                        userLocation.lat, userLocation.lng,
                        clickedMarkerData.lat, clickedMarkerData.lng
                    );
                    const distanceUserToClickedMarkerMeters = distanceUserToClickedMarkerKm * 1000;

                    console.log(`Clic en "${clickedMarkerData.name}". Distancia del usuario al marcador: ${distanceUserToClickedMarkerMeters.toFixed(0)} metros.`);

                    if (distanceUserToClickedMarkerMeters <= INTERACTION_RADIUS_METERS) {
                        console.log(`Usuario DENTRO del radio de interacción de ${INTERACTION_RADIUS_METERS}m.`);
                        if (clickedMarkerData.question && clickedMarkerData.answers && clickedMarkerData.answers.length > 0) {
                            console.log('Mostrando modal de pregunta.');
                            showQuestionModal(clickedMarkerData); 
                            return; 
                        } else {
                            popupContent = `<b>${clickedMarkerData.name || 'Punto de Interés'}</b><br>No hay pregunta disponible para este punto.`;
                            if (clickedMarkerData.description) {
                                popupContent += `<br>${clickedMarkerData.description}`;
                            }
                        }
                    } else {
                        console.log(`Usuario FUERA del radio de interacción de ${INTERACTION_RADIUS_METERS}m. Mostrando info básica.`);
                        popupContent = `<b>${clickedMarkerData.name || 'Punto de Interés'}</b>`;
                        if (clickedMarkerData.description) {
                            popupContent += `<br>${clickedMarkerData.description}`;
                        }
                        popupContent += `<br><small>(Acércate más para interactuar)</small>`;
                    }
                } else {
                    popupContent = `<b>${clickedMarkerData.name || 'Punto de Interés'}</b>`;
                    if (clickedMarkerData.description) {
                        popupContent += `<br>${clickedMarkerData.description}`;
                    }
                }
                this.bindPopup(popupContent).openPopup();
            });
            
            displayedMarkersLayer.addLayer(marker);
            markersShownCount++;
        }
    });
    console.log(`Total de marcadores mostrados en el mapa: ${markersShownCount}`);
    if (markersShownCount === 0 && allMarkersData.length > 0 && userLocation) {
        console.log("Ningún marcador estaba dentro del radio de visualización especificado de tu ubicación.");
    }
}