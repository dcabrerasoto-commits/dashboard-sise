const methods = {
  wsjf: {
    kicker: "Costo de esperar",
    title: "WSJF: ¿qué conviene atender antes?",
    description: "Favorece necesidades con alto costo de postergación y un esfuerzo abordable.",
    questions: [
      "¿Qué pierde la institución si este requerimiento espera?",
      "¿Existe una fecha, evento o ventana operativa que aumente la urgencia?",
      "¿La postergación mantiene un error, control débil o riesgo operacional?",
      "¿El esfuerzo estimado es proporcional al valor que se espera obtener?"
    ],
    avoids: "Ordenar únicamente por presión, antigüedad o preferencia personal.",
    use: "Relaciona impacto, urgencia, riesgo y cumplimiento con el esfuerzo estimado.",
    scoreTitle: "Cómo interpretar los puntajes WSJF",
    scoreIntro: "En esta adaptación, primero se califica el costo de postergar y luego se contrasta con el esfuerzo. Un valor alto significa que esperar genera una consecuencia mayor.",
    scale: [
      ["1", "La espera tiene un efecto menor y recuperable."],
      ["2", "Existe una molestia o ineficiencia acotada."],
      ["3", "La postergación afecta una operación relevante."],
      ["4", "Esperar mantiene errores, riesgos o costos importantes."],
      ["5", "La demora puede interrumpir servicios, incumplir una obligación o causar un daño crítico."]
    ],
    exampleScore: "Ejemplo: costo de esperar 4 de 5; esfuerzo 2 de 5",
    exampleReason: "La duplicidad puede inducir decisiones incorrectas y reducir la confianza en los datos. Si la corrección se limita a la consulta o visualización, el esfuerzo inicial sería relativamente bajo.",
    exampleReading: "Lectura: alto valor de atención frente a un esfuerzo aparentemente acotado; por ello tendería a adelantarse en la cartera."
  },
  rice: {
    kicker: "Alcance y evidencia",
    title: "RICE: ¿a quién beneficia y con qué certeza?",
    description: "Compara iniciativas considerando alcance, impacto, confianza y esfuerzo.",
    questions: [
      "¿A cuántos usuarios, territorios, fichas o procesos afecta?",
      "¿El beneficio es frecuente o corresponde a un caso excepcional?",
      "¿La necesidad está respaldada por evidencia y ejemplos verificables?",
      "¿La definición es suficiente para estimar sin inventar supuestos?"
    ],
    avoids: "Sobrevalorar ideas atractivas pero poco documentadas o de alcance limitado.",
    use: "Utiliza alcance, impacto, confianza y esfuerzo para mejorar comparabilidad.",
    scoreTitle: "Cómo interpretar los puntajes RICE",
    scoreIntro: "RICE revisa cuántas personas o procesos reciben el beneficio, cuánto cambia su situación, cuánta evidencia existe y qué esfuerzo requiere. Una nota alta debe estar respaldada por datos.",
    scale: [
      ["1", "Caso excepcional, impacto mínimo o información insuficiente."],
      ["2", "Alcance reducido y beneficio acotado."],
      ["3", "Afecta un grupo o proceso relevante con evidencia parcial."],
      ["4", "Alcance amplio, impacto claro y antecedentes verificables."],
      ["5", "Impacto transversal, frecuente y respaldado por evidencia sólida."]
    ],
    exampleScore: "Ejemplo: alcance 4; impacto 4; confianza 3; esfuerzo 2",
    exampleReason: "La consulta por RUN puede ser utilizada por distintos equipos y la duplicidad tiene un efecto visible. La confianza queda en 3 hasta confirmar cuántos casos existen y si el problema afecta solo la pantalla o también los registros.",
    exampleReading: "Lectura: la iniciativa parece conveniente, pero antes de cerrar su puntaje se debe medir la frecuencia y validar técnicamente el origen de la duplicidad."
  },
  gobierno: {
    kicker: "Sensibilidad institucional",
    title: "Gobierno TI: ¿qué debe proteger la institución?",
    description: "Incorpora criterios que no siempre quedan reflejados en el número de usuarios.",
    questions: [
      "¿Involucra datos personales, sensibles o críticos para beneficios?",
      "¿Afecta perfiles, autenticación, permisos o segregación de funciones?",
      "¿Existe obligación normativa, evidencia de auditoría o trazabilidad?",
      "¿Puede afectar continuidad operacional, integridad o confianza institucional?"
    ],
    avoids: "Postergar controles relevantes solo porque benefician a pocos usuarios visibles.",
    use: "Evalúa datos, seguridad, cumplimiento y riesgo como dimensión institucional.",
    scoreTitle: "Cómo interpretar los puntajes de Gobierno TI",
    scoreIntro: "Esta dimensión mide la exposición institucional asociada a datos, seguridad, cumplimiento, trazabilidad y continuidad. No depende únicamente de la cantidad de usuarios afectados.",
    scale: [
      ["1", "Sin exposición institucional relevante."],
      ["2", "Riesgo interno menor y controlable con procedimientos existentes."],
      ["3", "Afecta calidad de datos, trazabilidad o controles operativos."],
      ["4", "Compromete información crítica, decisiones o controles institucionales."],
      ["5", "Puede generar incumplimiento, exposición de datos, interrupción o daño institucional grave."]
    ],
    exampleScore: "Ejemplo: Gobierno TI 4 de 5",
    exampleReason: "Mostrar beneficios duplicados compromete la calidad y consistencia de información utilizada para atención o toma de decisiones, aunque todavía debe determinarse si altera datos persistidos.",
    exampleReading: "Lectura: requiere atención prioritaria por integridad de datos. Si además afecta pagos, registros oficiales o auditoría, la calificación podría subir a 5."
  }
};

const tabs = document.querySelectorAll(".method-tab");
const questionList = document.querySelector("#method-questions");

function renderMethod(key) {
  const method = methods[key];
  document.querySelector("#method-kicker").textContent = method.kicker;
  document.querySelector("#method-title").textContent = method.title;
  document.querySelector("#method-description").textContent = method.description;
  document.querySelector("#method-avoids").textContent = method.avoids;
  document.querySelector("#method-use").textContent = method.use;
  document.querySelector("#method-score-title").textContent = method.scoreTitle;
  document.querySelector("#method-score-intro").textContent = method.scoreIntro;
  document.querySelector("#method-score-scale").innerHTML = method.scale
    .map(([score, meaning]) => `<div><strong>${score}</strong><span>${meaning}</span></div>`)
    .join("");
  document.querySelector("#method-example-score").textContent = method.exampleScore;
  document.querySelector("#method-example-reason").textContent = method.exampleReason;
  document.querySelector("#method-example-reading").textContent = method.exampleReading;
  questionList.innerHTML = method.questions.map(question => `<li>${question}</li>`).join("");
  tabs.forEach(tab => {
    const active = tab.dataset.method === key;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

tabs.forEach(tab => tab.addEventListener("click", () => renderMethod(tab.dataset.method)));
renderMethod("wsjf");

document.querySelector(".nav-toggle").addEventListener("click", event => {
  const nav = document.querySelector("#main-nav");
  const open = nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".main-nav a").forEach(link => link.addEventListener("click", () => {
  document.querySelector("#main-nav").classList.remove("open");
  document.querySelector(".nav-toggle").setAttribute("aria-expanded", "false");
}));

const sliderIds = ["impact", "urgency", "risk", "governance", "effort"];
function updateSimulator() {
  const values = Object.fromEntries(sliderIds.map(id => [id, Number(document.querySelector(`#${id}`).value)]));
  sliderIds.forEach(id => {
    document.querySelector(`output[for="${id}"]`).value = values[id];
  });
  const valueScore = values.impact * 1.2 + values.urgency + values.risk * 1.1 + values.governance * 1.2;
  if (values.effort === 0) {
    const result = document.querySelector("#sim-priority");
    result.textContent = "PENDIENTE";
    result.className = "priority pending";
    document.querySelector("#sim-message").textContent = "Esfuerzo 0 significa que aún no fue estimado. La matriz no asigna prioridad hasta completar este dato.";
    return;
  }
  const score = valueScore / values.effort;
  let priority = "BAJA";
  let className = "low";
  let message = "Conviene mantener en backlog y completar antecedentes.";
  if (score >= 7.5) {
    priority = "CRIT";
    className = "crit";
    message = "Requiere revisión ejecutiva inmediata y validación de excepción.";
  } else if (score >= 5.2) {
    priority = "ALTA";
    className = "high";
    message = "Conviene incorporar a la cartera activa y validar capacidad.";
  } else if (score >= 3.3) {
    priority = "MEDIA";
    className = "medium";
    message = "Requiere calendarización y validación de alcance.";
  }
  const badge = document.querySelector("#sim-priority");
  badge.textContent = priority;
  badge.className = `priority ${className}`;
  document.querySelector("#sim-message").textContent = message;
}
sliderIds.forEach(id => document.querySelector(`#${id}`).addEventListener("input", updateSimulator));
updateSimulator();

const valuationAssumptions = {
  minor: { label: "Ajuste menor", hours: 4, increment: 1, weeks: ["días", "1 a 3 días"] },
  low: { label: "Baja", hours: 12, increment: 3, weeks: ["días", "3 días a 1 semana"] },
  medium: { label: "Media", hours: 32, increment: 6, weeks: ["1", "3 semanas"] },
  high: { label: "Alta", hours: 72, increment: 17, weeks: ["3", "6 semanas"] }
};
const valuationRates = {
  dai: { label: "DAI", rate: null },
  provider: { label: "Proveedor", rate: 0.3 }
};
const valuationState = { complexity: "medium", executor: "dai" };

function formatUf(value) {
  return value.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function updateValuation() {
  const assumption = valuationAssumptions[valuationState.complexity];
  const executor = valuationRates[valuationState.executor];
  const profiles = Number(document.querySelector("#valuation-profiles").value);
  const hours = assumption.hours + (profiles - 1) * assumption.increment;
  document.querySelector('output[for="valuation-profiles"]').value = profiles;
  document.querySelector("#valuation-complexity").textContent = assumption.label;
  document.querySelector("#valuation-hours").textContent = `${hours} h`;
  document.querySelector("#valuation-time").textContent =
    assumption.weeks[0] === "días" ? assumption.weeks[1] : `${assumption.weeks[0]} a ${assumption.weeks[1]}`;
  if (valuationState.executor === "dai") {
    document.querySelector("#valuation-rate-label").textContent = "Costo adicional";
    document.querySelector("#valuation-rate").textContent = "No aplica";
    document.querySelector("#valuation-total-label").textContent = "Dedicación interna estimada";
    document.querySelector("#valuation-total").textContent = `${hours} horas`;
    document.querySelector("#valuation-explanation").textContent =
      `Ejecución DAI con ${profiles} ${profiles === 1 ? "perfil interno" : "perfiles internos"}; no se calcula costo en UF.`;
  } else {
    const lower = hours * executor.rate * 0.9;
    const upper = hours * executor.rate * 1.15;
    document.querySelector("#valuation-rate-label").textContent = "Tarifa referencial";
    document.querySelector("#valuation-rate").textContent = `${formatUf(executor.rate)} UF/h`;
    document.querySelector("#valuation-total-label").textContent = "Rango referencial estimado";
    document.querySelector("#valuation-total").textContent = `${formatUf(lower)} a ${formatUf(upper)} UF`;
    document.querySelector("#valuation-explanation").textContent =
      `Ejemplo para proveedor, complejidad ${assumption.label.toLowerCase()} y ${profiles} ${profiles === 1 ? "perfil" : "perfiles"}.`;
  }
}

document.querySelectorAll("#complexity-options button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#complexity-options button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    valuationState.complexity = button.dataset.value;
    updateValuation();
  });
});

document.querySelectorAll("#executor-options button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#executor-options button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    valuationState.executor = button.dataset.value;
    updateValuation();
  });
});

document.querySelector("#valuation-profiles").addEventListener("input", updateValuation);
updateValuation();

document.querySelectorAll(".example-view-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".example-view-button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const examples = document.querySelector(".examples-grid");
    examples.classList.remove("view-original", "view-normalized", "view-compare");
    examples.classList.add(`view-${button.dataset.view}`);
  });
});

const demoSteps = [
  {
    original: "Al sincronizar sin internet se duplican registros.",
    normalized: "",
    priority: "—",
    priorityClass: "",
    status: "No resuelto",
    label: "Paso de ingreso",
    title: "La persona describe la necesidad",
    text: "La columna original conserva exactamente lo solicitado y sirve como evidencia del problema inicial."
  },
  {
    original: "Al sincronizar sin internet se duplican registros.",
    normalized: "Implementar operación sin conexión y sincronización posterior, controlando reintentos y evitando duplicidades.",
    priority: "—",
    priorityClass: "",
    status: "No resuelto",
    label: "Redacción TI",
    title: "Las reglas reconocen el patrón funcional",
    text: "El redactor propone una formulación técnica. La persona debe revisar que no cambie el sentido de la necesidad."
  },
  {
    original: "Al sincronizar sin internet se duplican registros.",
    normalized: "Implementar operación sin conexión y sincronización posterior, controlando reintentos y evitando duplicidades.",
    priority: "Evaluando…",
    priorityClass: "medium",
    status: "No resuelto",
    label: "Evaluación",
    title: "Se califican dimensiones comparables",
    text: "La matriz considera impacto, urgencia, riesgo, datos, seguridad, cumplimiento, alcance, confianza y esfuerzo."
  },
  {
    original: "Al sincronizar sin internet se duplican registros.",
    normalized: "Implementar operación sin conexión y sincronización posterior, controlando reintentos y evitando duplicidades.",
    priority: "ALTA",
    priorityClass: "high",
    status: "En desarrollo",
    label: "Decisión de cartera",
    title: "Jefatura y DAI revisan la recomendación",
    text: "La prioridad orienta el roadmap. La definición de DAI o Proveedor y el compromiso presupuestario siguen siendo manuales."
  },
  {
    original: "Al sincronizar sin internet se duplican registros.",
    normalized: "Implementar operación sin conexión y sincronización posterior, controlando reintentos y evitando duplicidades.",
    priority: "ALTA",
    priorityClass: "high",
    status: "Resuelto",
    label: "Cierre trazable",
    title: "El requerimiento pasa al histórico",
    text: "Se registra la fecha de resolución y la fila se traslada a Requerimientos Resueltos sin dejar espacios vacíos."
  }
];

let currentDemoStep = 0;
let demoTimer;
const originalCell = document.querySelector("#demo-original");
const normalizedCell = document.querySelector("#demo-normalized");
const priorityCell = document.querySelector("#demo-priority");

function typeText(element, text, speed = 20) {
  element.textContent = "";
  let index = 0;
  const typing = setInterval(() => {
    element.textContent += text[index] || "";
    index += 1;
    if (index >= text.length) clearInterval(typing);
  }, speed);
}

function renderDemoStep(index, animate = true) {
  currentDemoStep = index;
  const step = demoSteps[index];
  document.querySelectorAll(".demo-step").forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === index);
  });
  if (animate && index === 0) typeText(originalCell, step.original, 22);
  else originalCell.textContent = step.original;
  if (animate && index === 1) typeText(normalizedCell, step.normalized, 10);
  else normalizedCell.textContent = step.normalized;
  priorityCell.textContent = step.priority;
  priorityCell.className = `priority-placeholder ${step.priorityClass ? `priority ${step.priorityClass}` : ""}`;
  document.querySelector("#demo-status").textContent = step.status;
  document.querySelector("#demo-caption-label").textContent = step.label;
  document.querySelector("#demo-caption-title").textContent = step.title;
  document.querySelector("#demo-caption-text").textContent = step.text;
  document.querySelector("#demo-progress-bar").style.width = `${((index + 1) / demoSteps.length) * 100}%`;
}

function startDemo() {
  clearInterval(demoTimer);
  renderDemoStep(0);
  demoTimer = setInterval(() => {
    const next = (currentDemoStep + 1) % demoSteps.length;
    renderDemoStep(next);
  }, 5200);
}

document.querySelectorAll(".demo-step").forEach(button => {
  button.addEventListener("click", () => {
    clearInterval(demoTimer);
    renderDemoStep(Number(button.dataset.step));
  });
});
document.querySelector("#restart-demo").addEventListener("click", startDemo);
startDemo();
