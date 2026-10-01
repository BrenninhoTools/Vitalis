import { diseases, symptoms } from "./data.js";

const symptomIndex = new Map(symptoms.map((symptom) => [symptom.key, symptom]));

const totals = Object.fromEntries(
  diseases.map((disease) => [
    disease.id,
    symptoms.reduce((sum, symptom) => sum + (symptom.weights[disease.id] || 0), 0)
  ])
);

const outcomes = {
  urgent: {
    headline: "Respiratory warning signs detected",
    summary:
      "Breathing difficulty can indicate a serious condition. Seek in person medical care promptly, and call emergency services if breathing worsens, lips look bluish, or chest pain develops.",
    steps: [
      "Contact a healthcare provider or urgent care service today",
      "Call emergency services immediately if breathing becomes labored at rest",
      "Stay upright, keep the room ventilated, and avoid exertion",
      "Monitor temperature and oxygen saturation every few hours if a pulse oximeter is available"
    ]
  },
  elevated: {
    headline: "Influenza like pattern",
    summary:
      "The selected indicators align with an acute systemic viral illness such as influenza. Early clinical evaluation is recommended, since antivirals work best within 48 hours of onset.",
    steps: [
      "Schedule a consultation with a healthcare provider within 24 to 48 hours",
      "Start structured oral hydration with electrolyte balanced solutions",
      "Rest in a well ventilated, separate room to limit transmission",
      "Check temperature every four hours and note any sudden change"
    ]
  },
  mild: {
    headline: "Mild viral pattern",
    summary:
      "The selected indicators correspond to a typical seasonal cold or mild viral exposure. Home care is usually sufficient, and symptoms tend to ease within a week.",
    steps: [
      "Aim for 8 to 10 hours of restorative sleep each night",
      "Drink warm fluids such as herbal teas and broths",
      "Use saline sprays or steam inhalation for airway comfort",
      "Watch for new fever spikes or symptoms lasting beyond ten days"
    ]
  }
};

function severityFor(selected, ranked) {
  if (selected.some((symptom) => symptom.redFlag)) return "urgent";
  const keys = new Set(selected.map((symptom) => symptom.key));
  if (keys.has("highFever") && keys.has("bodyAches")) return "elevated";
  if (ranked[0]?.id === "fluA" && selected.length >= 3) return "elevated";
  return "mild";
}

export function assess(keys) {
  const selected = [...new Set(keys)].map((key) => symptomIndex.get(key));

  const ranked = diseases
    .map((disease) => {
      const raw = selected.reduce((sum, symptom) => sum + (symptom.weights[disease.id] || 0), 0);
      return {
        id: disease.id,
        name: disease.name,
        category: disease.category,
        score: Math.round((raw / totals[disease.id]) * 100)
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const severity = severityFor(selected, ranked);
  return { severity, ...outcomes[severity], matches: ranked };
}

export function isKnownSymptom(key) {
  return symptomIndex.has(key);
}
