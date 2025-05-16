let map;
let userLocation; // Se establecerá con la geolocalización
let userMarker; // Para almacenar el marcador del usuario
let accuracyCircle; // Para almacenar el círculo de precisión
let allMarkersData = []; // Almacenará todos los marcadores cargados del JSON
let displayedMarkersLayer; // Declarar globalmente sin inicializar aquí

const INTERACTION_RADIUS_METERS = 50; // Radio en metros para mostrar la pregunta

// Definición de iconos (similar a ParteMapa/render.js)
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
    default: L.icon({ // Icono por defecto si no se especifica o no se encuentra
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    })
};

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([40.416775, -3.703790], 6); // Vista inicial por defecto

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Inicializa displayedMarkersLayer aquí
    displayedMarkersLayer = L.layerGroup().addTo(map);

    map.locate({ watch: true, setView: false, enableHighAccuracy: true });

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError); // Asegúrate de tener esta función definida

    fetchMarkers(); // Carga inicial de marcadores

    // Event listener para el botón de cerrar el modal
    const closeModalButton = document.getElementById('closeModalButton');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideQuestionModal);
    }
    // Opcional: cerrar modal si se hace clic fuera del contenido del modal
    const questionModalOverlay = document.getElementById('questionModal');
    if (questionModalOverlay) {
        questionModalOverlay.addEventListener('click', function(event) {
            if (event.target === questionModalOverlay) { // Si el clic es en el overlay directamente
                hideQuestionModal();
            }
        });
    }

    // Añadir listener para actualizar marcadores cuando la pestaña/app se vuelve visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('Página visible, actualizando marcadores desde ParteMovil/map.js...');
            fetchMarkers(); // Re-solicitar marcadores
        }
    });
});

// Nueva función para barajar un array (Fisher-Yates shuffle)
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array]; // Crear una copia para no mutar el original

    // Mientras queden elementos a barajar.
    while (currentIndex !== 0) {
        // Elegir un elemento restante.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // E intercambiarlo con el elemento actual.
        [newArray[currentIndex], newArray[randomIndex]] = [
            newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
}

function onLocationFound(e) {
    userLocation = e.latlng;
    const newRadius = 2000; // Radio en metros, 2 kilómetros

    if (!userMarker) { // Si es la primera vez que se encuentra la ubicación
        map.setView(userLocation, 13); // Ajustar vista y zoom para el nuevo radio

        userMarker = L.marker(userLocation, { icon: iconTypes.default })
            .addTo(map)
            .bindPopup("¡Estás aquí!")
            .openPopup();

        accuracyCircle = L.circle(userLocation, {
            radius: newRadius,
            weight: 1, // Grosor del borde del círculo
            color: 'blue', // Color del borde
            fillColor: '#3388ff', // Color de relleno
            fillOpacity: 0.1 // Opacidad del relleno (0.05 es muy bajo, 0.1 o 0.15 es mejor)
        }).addTo(map);
    } else { // Si ya existen, solo actualizar su posición y radio
        userMarker.setLatLng(userLocation);
        accuracyCircle.setLatLng(userLocation).setRadius(newRadius);
        // Opcional: si quieres que el mapa se centre en el usuario con cada actualización:
        // map.panTo(userLocation);
    }

    console.log('Ubicación actualizada:', userLocation);
    // Una vez encontrada/actualizada la ubicación, filtrar y mostrar marcadores cercanos
    // Asegurarse de que allMarkersData ya se haya cargado
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
    // Si no se puede obtener la ubicación, no se llamará a displayNearbyMarkers con userLocation.
    // Podrías optar por mostrar todos los marcadores si lo deseas, o ninguno.
    // Por ahora, si no hay ubicación, los logs en displayNearbyMarkers lo indicarán.
    displayNearbyMarkers(); // Intentará mostrar, pero sin userLocation, los logs lo dirán.
}

function fetchMarkers() {
    // Añadir un parámetro anti-caché a la URL para asegurar datos frescos
    const cacheBuster = new Date().getTime();
    fetch(`../ParteMapa/localizaciones/markers-todos.json?t=${cacheBuster}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, ${response.statusText}`);
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
            // Si la ubicación ya se encontró, mostrar marcadores. Si no, onLocationFound lo hará.
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

// Función para calcular la distancia entre dos coordenadas (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// --- Funciones para el Modal de Preguntas ---
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
    
    // Log 1: Verifica los datos del marcador y sus respuestas al entrar a la función
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

        // Logs detallados para depurar isCorrect
        const originalIsCorrect = answer.isCorrect;
        const typeOfOriginalIsCorrect = typeof originalIsCorrect;
        const stringifiedIsCorrectNormalized = String(originalIsCorrect).trim().toLowerCase();
        const isDataSetGoingToBeTrue = stringifiedIsCorrectNormalized === 'true';

        console.log(`Respuesta: "${answer.text}"
          Original isCorrect: ${originalIsCorrect} (Tipo: ${typeOfOriginalIsCorrect})
          Stringified/Normalized: "${stringifiedIsCorrectNormalized}"
          Dataset será 'true'?: ${isDataSetGoingToBeTrue}`);
        
        button.dataset.isCorrect = stringifiedIsCorrectNormalized; // Asignar el valor normalizado

        button.onclick = function() {
            const allButtons = answersContainerEl.querySelectorAll('.answer-button');
            allButtons.forEach(btn => {
                btn.disabled = true; 
                if (btn.dataset.isCorrect === 'true') {
                    btn.classList.add('correct-answer');
                }
            });

            // Log 4: Dentro de onclick, verifica el valor del dataset del botón pulsado
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
        // Opcional: resetear el contenido del modal al cerrarlo para la próxima vez
        // const resultTextEl = document.getElementById('modalResultText');
        // if (resultTextEl) resultTextEl.textContent = '';
        // const answersContainerEl = document.getElementById('modalAnswersContainer');
        // if (answersContainerEl) answersContainerEl.innerHTML = '';
    }
}
// --- Fin Funciones para el Modal de Preguntas ---


function displayNearbyMarkers() {
    console.log('Ejecutando displayNearbyMarkers...');
    if (!displayedMarkersLayer) {
        console.error("displayedMarkersLayer no está inicializado.");
        return;
    }
    displayedMarkersLayer.clearLayers(); // Limpiar marcadores anteriores

    const radiusKmToShowMarkers = 2; // Radio en kilómetros para mostrar marcadores en el mapa
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
            return; // Saltar este marcador
        }

        const distanceToMarker = calculateDistance(
            userLocation.lat, userLocation.lng,
            markerData.lat, markerData.lng
        );
        
        // Log para cada marcador, incluso si está lejos del radio de visualización
        console.log(`Marcador: "${markerData.name || 'Sin nombre'}" (ID: ${markerData.id || 'N/A'}) - Distancia para visualización: ${distanceToMarker.toFixed(2)} km`);

        if (distanceToMarker <= radiusKmToShowMarkers) {
            console.log(`-> MOSTRANDO EN MAPA: "${markerData.name}" porque está a ${distanceToMarker.toFixed(2)} km (dentro del radio de visualización de ${radiusKmToShowMarkers} km).`);
            
            const icon = iconTypes[markerData.iconType] || iconTypes.default;
            const marker = L.marker([markerData.lat, markerData.lng], { icon: icon });
            
            marker.customData = markerData;

            marker.on('click', function() {
                const clickedMarkerData = this.customData;
                let popupContent = ''; // Para el popup simple si no se muestra el modal

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
                            showQuestionModal(clickedMarkerData); // <--- AQUÍ SE LLAMA AL MODAL
                            return; // Salir para no mostrar el popup de Leaflet
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
                // Solo mostrar el popup de Leaflet si no se mostró el modal
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