const { GoogleGenAI } = require('@google/genai');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const Organization = require('../models/Organization');
const Service = require('../models/Service');
const queueService = require('../services/queueService');

// Primary & fallback models verified for current Gemini API compatibility
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest'
];

const getSystemInstruction = (contextStr, userContextStr) => `
You are the QueueLess Smart Assistant for the QueueLess queue and appointment management platform.
Your role is to assist customers with:
1. Finding organisations by category (Hospitals, Banks, Diagnostic Labs, Colleges/Universities, Government Services) and location/city (e.g., Jamshedpur, Ranchi, Patna).
2. Explaining available services, booking requirements (appointment vs live walk-in queue), and estimated durations.
3. Guiding users step-by-step on how to browse organisations, book appointments, join live queues, and check in.
4. Explaining real-time queue tokens, people ahead, and estimated wait times.
5. Providing the user's active queue status and upcoming appointments if they ask about their current tickets or queues.

CRITICAL GROUNDING & SAFETY RULES:
- STRICTLY ground all organisation and service recommendations in the APPROVED ORGANIZATIONS & SERVICES database context below.
- Do NOT invent, fabricate, or hallucinate organisations, branches, addresses, doctors, or services that are not listed in the context.
- If a user asks for an organisation, city, or service that is not in the system context (e.g., an airport or a clinic in Mumbai), clearly and politely inform them that it is not currently available on QueueLess, and mention the available cities (Jamshedpur, Ranchi, Patna) or related categories.
- NEVER provide medical diagnoses, treatment advice, or triage medical emergencies. QueueLess is strictly an administrative scheduling and queue management platform. For medical emergencies, advise immediate contact with emergency healthcare services (e.g., dial 108/112).
- Keep your responses friendly, concise, and beautifully formatted with markdown bullet points and bold headers for easy reading in the chat bubble.

APPROVED ORGANIZATIONS & SERVICES DATABASE CONTEXT:
${contextStr}

CURRENT USER STATUS & CONTEXT:
${userContextStr}
`;

exports.chat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("AI Controller Error: Missing GEMINI_API_KEY in environment variables.");
      return res.status(503).json({ 
        message: "AI assistance is temporarily unavailable. Please configure GEMINI_API_KEY." 
      });
    }

    // 1. Fetch approved organizations & services from database for grounding
    let contextStr = "Approved Organizations and Services:\n";
    try {
      const orgs = await Organization.find({ isActive: true, status: 'approved' }).lean();
      const services = await Service.find({ isActive: true }).lean();

      if (orgs.length === 0) {
        contextStr += "(No approved organizations currently listed.)\n";
      } else {
        orgs.forEach(o => {
          const orgServices = services.filter(s => s.organization && s.organization.toString() === o._id.toString());
          const serviceList = orgServices.length > 0
            ? orgServices.map(s => `${s.name} (${s.type}, ~${s.estimatedDuration || 15} mins)`).join(', ')
            : 'No active services';
          contextStr += `• [${o.type}] ${o.name} | City: ${o.address?.city || 'N/A'}, ${o.address?.state || ''} | Hours: ${o.businessHours?.open || '09:00'} - ${o.businessHours?.close || '17:00'}\n  Services: ${serviceList}\n`;
        });
      }
    } catch (dbErr) {
      console.error("AI Controller: Error loading organizations context:", dbErr.message);
      contextStr += "(System context temporarily limited due to database lookup.)\n";
    }

    // 2. Fetch logged-in user context (active queues & appointments)
    let userContextStr = "User is browsing as a guest or unauthenticated visitor.\n";
    if (req.user && req.user._id) {
      userContextStr = `Customer Name: ${req.user.name || 'Customer'}\n`;
      try {
        const activeQueues = await QueueEntry.find({
          customer: req.user._id,
          status: { $in: ['waiting', 'called', 'serving'] }
        }).populate('organization', 'name address').populate('service', 'name estimatedDuration');

        if (activeQueues.length > 0) {
          userContextStr += "Active Queue Entries:\n";
          for (const q of activeQueues) {
            try {
              const statusObj = await queueService.getQueueStatus(q._id);
              userContextStr += `- Token: ${q.tokenNumber} | Organization: ${q.organization?.name || 'N/A'} | Service: ${q.service?.name || 'N/A'} | Status: ${q.status} | People Ahead: ${statusObj.peopleAhead} | Est. Wait: ~${statusObj.estimatedWaitTime} mins | Currently Serving: ${statusObj.currentServingToken || 'None'}\n`;
            } catch (qsErr) {
              userContextStr += `- Token: ${q.tokenNumber} | Organization: ${q.organization?.name || 'N/A'} | Service: ${q.service?.name || 'N/A'} | Status: ${q.status}\n`;
            }
          }
        } else {
          userContextStr += "Active Queues: None (customer is not currently in any waiting queues).\n";
        }

        const upcomingAppointments = await Appointment.find({
          customer: req.user._id,
          status: 'scheduled',
          date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }).populate('organization', 'name address').populate('service', 'name').sort({ date: 1, time: 1 }).limit(5);

        if (upcomingAppointments.length > 0) {
          userContextStr += "Upcoming Scheduled Appointments:\n";
          upcomingAppointments.forEach(a => {
            const dateStr = a.date ? new Date(a.date).toLocaleDateString() : 'N/A';
            userContextStr += `- Date: ${dateStr} at ${a.time} | Org: ${a.organization?.name || 'N/A'} | Service: ${a.service?.name || 'N/A'} | Token: ${a.tokenNumber || 'Assigned on check-in'} | Checked In: ${a.checkInStatus ? 'Yes' : 'No'}\n`;
          });
        } else {
          userContextStr += "Upcoming Appointments: None scheduled.\n";
        }
      } catch (userErr) {
        console.error("AI Controller: Error loading user queue context:", userErr.message);
      }
    }

    // 3. Prepare structured conversation contents
    const rawContents = [];
    if (history && Array.isArray(history)) {
      history.forEach(item => {
        if (!item || !item.content || item.isError) return;
        const role = item.role === 'assistant' ? 'model' : 'user';
        rawContents.push({ role, parts: [{ text: item.content }] });
      });
    }
    rawContents.push({ role: 'user', parts: [{ text: message.trim() }] });

    // Merge consecutive identical roles to guarantee strict alternating roles for Gemini
    const mergedContents = [];
    for (const item of rawContents) {
      if (mergedContents.length > 0 && mergedContents[mergedContents.length - 1].role === item.role) {
        mergedContents[mergedContents.length - 1].parts[0].text += '\n' + item.parts[0].text;
      } else {
        mergedContents.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
      }
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = getSystemInstruction(contextStr, userContextStr);

    let replyText = null;
    let lastApiError = null;

    // 4. Try candidate models in order with resilient fallback
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: mergedContents,
          config: {
            systemInstruction,
            temperature: 0.3,
          }
        });

        if (response && response.text) {
          replyText = response.text.trim();
          break; // Successfully generated content
        }
      } catch (err) {
        console.warn(`Gemini Model [${modelName}] failed (${err.status || err.message}). Checking next fallback...`);
        lastApiError = err;
      }
    }

    if (!replyText) {
      console.error("All Gemini candidate models failed. Last error:", lastApiError);
      if (lastApiError?.status === 429) {
        return res.status(429).json({
          message: "QueueLess AI Assistant is currently experiencing high demand. Please try again in a moment."
        });
      }
      if (lastApiError?.status === 503) {
        return res.status(503).json({
          message: "The AI service is temporarily busy. Please try again shortly."
        });
      }
      return res.status(500).json({
        message: "AI assistance is temporarily unavailable. Please try again."
      });
    }

    return res.json({ success: true, reply: replyText });

  } catch (error) {
    console.error("AI Controller Unhandled Error:", error);
    res.status(500).json({ message: "AI assistance is temporarily unavailable. Please try again." });
  }
};
