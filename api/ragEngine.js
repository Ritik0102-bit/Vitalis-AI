const fs = require('fs');
const path = require('path');

// Load Local Multi-Specialty ChatDoctor Knowledge Base Cache
let kbData = [];
try {
  const kbPath = path.join(__dirname, '../data/chatdoctor_kb.json');
  if (fs.existsSync(kbPath)) {
    kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
  }
} catch (e) {
  console.error("Error loading ChatDoctor KB:", e);
}

/**
 * Tokenize and normalize text for lightweight semantic / BM25-like scoring
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

/**
 * Retrieve top matched clinical consultations from both Local ChatDoctor KB Cache
 * AND Live Hugging Face 100k ChatDoctor/HealthCareMagic Dataset Query Streaming API (Hybrid RAG)
 */
async function retrieveClinicalContext(query, topK = 2) {
  if (!query) return [];

  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];

  let scoredCases = [];

  // 1. Score Local Curated Knowledge Base (High Speed < 5ms)
  if (kbData && kbData.length > 0) {
    scoredCases = kbData.map(item => {
      let score = 0;
      
      // Check symptom exact matches (High Weight)
      item.symptoms.forEach(sym => {
        const symTokens = tokenize(sym);
        const isMatch = symTokens.some(st => queryTokens.has(st));
        if (isMatch) score += 15;
      });

      // Check specialty matches
      tokenize(item.specialty).forEach(token => {
        if (queryTokens.has(token)) score += 8;
      });

      // Check patient query word overlap
      const docTokens = tokenize(item.patient_query);
      let overlapCount = 0;
      docTokens.forEach(token => {
        if (queryTokens.has(token)) overlapCount++;
      });

      score += (overlapCount * 3);

      const maxPossScore = (queryTokens.size * 5) + 30;
      const simPercent = Math.min(Math.round((score / maxPossScore) * 100) + 40, 98);

      return {
        id: item.id,
        specialty: item.specialty,
        symptoms: item.symptoms,
        patient_query: item.patient_query,
        doctor_response: item.doctor_response,
        raw_score: score,
        similarity_score: score > 0 ? simPercent : 0,
        source: "Local ChatDoctor KB"
      };
    }).filter(c => c.raw_score > 0);
  }

  // 2. Hybrid RAG: If local matches are not super strong OR just to enrich from the massive 100k online dataset,
  // query Hugging Face's Live Dataset Server API (lavita/ChatDoctor-HealthCareMagic-100k) with a 1500ms timeout!
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s max wait for online streaming

    const hfSearchUrl = `https://datasets-server.huggingface.co/search?dataset=lavita/ChatDoctor-HealthCareMagic-100k&config=default&split=train&query=${encodeURIComponent(query.substring(0, 100))}`;
    const hfRes = await fetch(hfSearchUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (hfRes.ok) {
      const hfData = await hfRes.json();
      if (hfData && Array.isArray(hfData.rows)) {
        hfData.rows.slice(0, 3).forEach((rowObj, idx) => {
          const row = rowObj.row || {};
          const patientQ = row.input || row.instruction || "";
          const doctorA = row.output || row.response || "";
          
          if (patientQ && doctorA) {
            // Score the live 100k dataset match against our query tokens
            const docTokens = tokenize(patientQ);
            let overlapCount = 0;
            docTokens.forEach(token => {
              if (queryTokens.has(token)) overlapCount++;
            });

            const rawScore = overlapCount * 5 + 20;
            const simPercent = Math.min(Math.round((overlapCount / queryTokens.size) * 100) + 45, 96);

            scoredCases.push({
              id: `HF-100k-#${rowObj.row_idx || (idx + 500)}`,
              specialty: "HealthCareMagic Live Consultation (100k Dataset)",
              symptoms: Array.from(queryTokens),
              patient_query: patientQ,
              doctor_response: doctorA,
              raw_score: rawScore,
              similarity_score: simPercent,
              source: "Live ChatDoctor 100k API"
            });
          }
        });
      }
    }
  } catch (err) {
    // Graceful fallback: If offline or HF API times out, silently continue using our high-speed local KB!
  }

  // Sort and return top K highest scoring clinical consultations
  return scoredCases
    .sort((a, b) => b.raw_score - a.raw_score)
    .slice(0, topK);
}

/**
 * Assess Triage Acuity Level based on clinical symptoms
 * Level 1: Immediate Emergency (Red Flag)
 * Level 2: Urgent Medical Evaluation (24-48 hours)
 * Level 3: Routine Consultation / Diagnosis
 * Level 4: Mild / Home Self-Care
 */
function assessClinicalTriage(query) {
  const qLower = (query || "").toLowerCase();

  // Level 1: Red Flag Keywords
  const level1Keywords = [
    "chest pain", "heart attack", "shortness of breath", "radiating to arm", 
    "jaw pain", "thunderclap headache", "stiff neck and severe headache", 
    "anaphylaxis", "facial swelling", "difficulty breathing", "suicide", 
    "uncontrollable bleeding", "slurred speech", "numbness on one side"
  ];

  for (const kw of level1Keywords) {
    if (qLower.includes(kw)) {
      return {
        level: 1,
        title: "CRITICAL RED FLAG - EMERGENCY TRIAGE",
        description: `Potential life-threatening symptoms detected (${kw}). Immediate emergency medical attention (911 / ER) is strongly advised.`,
        color: "#EF4444" // Red
      };
    }
  }

  // Level 2: Urgent Evaluation Keywords
  const level2Keywords = [
    "severe headache", "high fever", "103", "104", "blood in stool", 
    "vomiting for 2 days", "severe abdominal pain", "sharp stomach cramps", 
    "fainting", "blurred vision", "sudden rash with swelling"
  ];

  for (const kw of level2Keywords) {
    if (qLower.includes(kw)) {
      return {
        level: 2,
        title: "URGENT MEDICAL EVALUATION RECOMMENDED",
        description: `Symptom cluster requires prompt evaluation by a physician or urgent care clinic within 24 to 48 hours.`,
        color: "#F97316" // Orange
      };
    }
  }

  // Level 3 & 4: Routine / Self Care
  const routineKeywords = ["mild", "slightly", "rolled my ankle", "sprain", "sore throat", "dry cough", "itchy", "tension headache"];
  for (const kw of routineKeywords) {
    if (qLower.includes(kw)) {
      return {
        level: 4,
        title: "CLINICAL TRIAGE: MILD / HOME MANAGEMENT SUITABLE",
        description: `Symptoms appear mild or appropriate for initial self-care protocols and standard over-the-counter monitoring.`,
        color: "#10B981" // Green
      };
    }
  }

  return {
    level: 3,
    title: "STANDARD CLINICAL CONSULTATION",
    description: `Symptoms suggest a medical condition that warrants diagnostic screening or a scheduled consultation with your healthcare provider.`,
    color: "#3B82F6" // Blue
  };
}

module.exports = {
  retrieveClinicalContext,
  assessClinicalTriage
};
