// Asumo que otras funciones como shuffleArray, hideQuestionModal, etc.,
// y la inicialización del mapa están en este archivo o se importan correctamente.

// --- Funciones para el Modal de Preguntas ---
function showQuestionModal(markerData) {
    const modal = document.getElementById('questionModal');
    const markerNameEl = document.getElementById('modalMarkerName');
    const questionTextEl = document.getElementById('modalQuestionText');
    const answersContainerEl = document.getElementById('modalAnswersContainer');
    const resultTextEl = document.getElementById('modalResultText');

    if (!modal || !questionTextEl || !answersContainerEl || !markerNameEl || !resultTextEl) {
        console.error('Elementos del modal no encontrados en el DOM. Asegúrate de que el HTML del modal está en tu index.html y los IDs son correctos.');
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

    const shuffledAnswers = shuffleArray(markerData.answers); // Asegúrate que shuffleArray esté definida
    const answerButtonColors = ['color-0', 'color-1', 'color-2', 'color-3']; 

    shuffledAnswers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.classList.add('answer-button');
        button.classList.add(answerButtonColors[index % answerButtonColors.length]); 
        button.textContent = answer.text;

        // Logs detallados para depurar isCorrect
        const originalIsCorrect = answer.isCorrect;
        const typeOfOriginalIsCorrect = typeof originalIsCorrect;
        // Normalización: convertir a string, quitar espacios, pasar a minúsculas
        const stringifiedIsCorrectNormalized = String(originalIsCorrect).trim().toLowerCase();
        // Comprobar si el valor normalizado es exactamente "true"
        const isDataSetGoingToBeTrue = stringifiedIsCorrectNormalized === 'true';

        console.log(`Respuesta: "${answer.text}"
          Original isCorrect: ${originalIsCorrect} (Tipo: ${typeOfOriginalIsCorrect})
          Stringified/Normalized: "${stringifiedIsCorrectNormalized}"
          Dataset será 'true'?: ${isDataSetGoingToBeTrue}`);
        
        // Asignar el valor normalizado al dataset.
        // Si isDataSetGoingToBeTrue es false para la respuesta correcta, aquí está el problema.
        button.dataset.isCorrect = stringifiedIsCorrectNormalized; 

        button.onclick = function() {
            const allButtons = answersContainerEl.querySelectorAll('.answer-button');
            allButtons.forEach(btn => {
                btn.disabled = true; 
                // Esta parte marca visualmente el botón correcto, si su dataset es 'true'
                if (btn.dataset.isCorrect === 'true') {
                    btn.classList.add('correct-answer');
                }
            });

            // Log al pulsar: verifica el valor del dataset del botón pulsado
            console.log(`Botón pulsado: Texto='${this.textContent}', dataset.isCorrect='${this.dataset.isCorrect}'`);

            // Comprueba si el botón pulsado es el correcto
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

// ... Aquí irían otras funciones de tu archivo javascript.js como hideQuestionModal,
// shuffleArray, y la lógica de inicialización del mapa y DOMContentLoaded si está en este archivo.

// Ejemplo de cómo podría estar shuffleArray (asegúrate de tenerla):
// function shuffleArray(array) {
//     let currentIndex = array.length, randomIndex;
//     const newArray = [...array]; 
//     while (currentIndex !== 0) {
//         randomIndex = Math.floor(Math.random() * currentIndex);
//         currentIndex--;
//         [newArray[currentIndex], newArray[randomIndex]] = [
//             newArray[randomIndex], newArray[currentIndex]];
//     }
//     return newArray;
// }

// Ejemplo de cómo podría estar el DOMContentLoaded si toda la lógica está aquí:
// document.addEventListener('DOMContentLoaded', () => {
//     // ... inicialización del mapa ...
//     // map = L.map('map').setView([40.416775, -3.703790], 6);
//     // ...
//     // fetchMarkers(); // Si fetchMarkers llama a showQuestionModal
//
//     // Event listener para el botón de cerrar el modal
//     const closeModalButton = document.getElementById('closeModalButton');
//     if (closeModalButton) {
//         closeModalButton.addEventListener('click', hideQuestionModal);
//     }
//     // Opcional: cerrar modal si se hace clic fuera del contenido del modal
//     const questionModalOverlay = document.getElementById('questionModal');
//     if (questionModalOverlay) {
//         questionModalOverlay.addEventListener('click', function(event) {
//             if (event.target === questionModalOverlay) { 
//                 hideQuestionModal();
//             }
//         });
//     }
// });