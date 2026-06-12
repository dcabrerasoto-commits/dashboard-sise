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
    use: "Relaciona impacto, urgencia, riesgo y cumplimiento con el esfuerzo estimado."
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
    use: "Utiliza alcance, impacto, confianza y esfuerzo para mejorar comparabilidad."
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
    use: "Evalúa datos, seguridad, cumplimiento y riesgo como dimensión institucional."
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
  const score = valueScore / Math.max(values.effort, 1);
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

document.querySelectorAll(".filter-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const filter = button.dataset.filter;
    document.querySelectorAll(".example-card").forEach(card => {
      const categories = card.dataset.category.split(" ");
      card.classList.toggle("hidden", filter !== "all" && !categories.includes(filter));
    });
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
