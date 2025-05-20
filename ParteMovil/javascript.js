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