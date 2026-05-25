function porcentajeGrafico(valor) {
    return `${Number(valor || 0).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

const doughnutPercentageLabels = {
    id: "doughnutPercentageLabels",
    afterDatasetsDraw(chart) {
        const dataset = chart.data.datasets[0];
        const meta = chart.getDatasetMeta(0);
        if (!dataset || !meta || !meta.data || !meta.data.length) return;
        const total = dataset.data.reduce((acc, value) => acc + Number(value || 0), 0);
        if (!total) return;
        const { ctx } = chart;
        ctx.save();
        ctx.font = "700 11px Segoe UI";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        meta.data.forEach((arc, index) => {
            const valor = Number(dataset.data[index] || 0);
            if (!valor) return;
            const porcentaje = (valor / total) * 100;
            if (porcentaje < 4) return;
            const angle = (arc.startAngle + arc.endAngle) / 2;
            const radius = arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.58;
            const x = arc.x + Math.cos(angle) * radius;
            const y = arc.y + Math.sin(angle) * radius;
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "rgba(15, 23, 42, 0.22)";
            ctx.lineWidth = 3;
            const etiqueta = porcentajeGrafico(porcentaje);
            ctx.strokeText(etiqueta, x, y);
            ctx.fillText(etiqueta, x, y);
        });
        ctx.restore();
    }
};

function crearGraficos(monthData) {
    const ctxEstado = document.getElementById("estadoChart");
    const ctxTrend = document.getElementById("trendChart");
    if (!ctxEstado || !ctxTrend) return;
    if (chartEstado) chartEstado.destroy();
    if (chartTendencia) chartTendencia.destroy();
    if (chartRegion) chartRegion.destroy();
    chartEstado = new Chart(ctxEstado, {
        plugins: [doughnutPercentageLabels],
        type: "doughnut",
        data: {
            labels: ["Con acreditación vigente", "No vigente", "Sin acreditación previa", "Sin estado"],
            datasets: [{ data: [monthData.acreditado, monthData.noVigente, monthData.noAcreditado, monthData.sinEstado], backgroundColor: ["#1a7a4a", "#b45309", "#b91c1c", "#64748b"], borderColor: "#ffffff", borderWidth: 2 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((acc, value) => acc + Number(value || 0), 0);
                            const valor = Number(context.raw || 0);
                            const porcentaje = total > 0 ? (valor / total) * 100 : 0;
                            return `${context.label}: ${porcentajeGrafico(porcentaje)}`;
                        }
                    }
                }
            },
            cutout: "64%"
        }
    });
    chartTendencia = new Chart(ctxTrend, {
        type: "line",
        data: {
            labels: dashboardData.monthly.map((m) => typeof mesNombrePropioText === "function" ? mesNombrePropioText(m.label) : m.label),
            datasets: [
                { label: "Con acreditación vigente", data: dashboardData.monthly.map((m) => m.acreditado), borderColor: "#1a7a4a", backgroundColor: "rgba(26,122,74,0.12)", pointBackgroundColor: "#1a7a4a", pointRadius: 4, tension: 0.25, fill: false },
                { label: "No vigente", data: dashboardData.monthly.map((m) => m.noVigente), borderColor: "#b45309", backgroundColor: "rgba(180,83,9,0.12)", pointBackgroundColor: "#b45309", pointRadius: 4, tension: 0.25, fill: false },
                { label: "Sin acreditación previa", data: dashboardData.monthly.map((m) => m.noAcreditado), borderColor: "#b91c1c", backgroundColor: "rgba(185,28,28,0.12)", pointBackgroundColor: "#b91c1c", pointRadius: 4, tension: 0.25, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom", labels: { font: { size: 12 } } } },
            scales: { x: { ticks: { font: { size: 11 } }, grid: { display: false } }, y: { beginAtZero: true, ticks: { font: { size: 11 } } } }
        }
    });
}
