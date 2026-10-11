const { GoogleGenAI } = require('@google/genai');
const QueueEntry = require('../models/QueueEntry');
const Organization = require('../models/Organization');
const Service = require('../models/Service');
const queueService = require('../services/queueService');

const getSystemInstruction = (contextStr) => `
You are the QueueLess virtual assistant. Your role is to help customers:
1. Find services available on the platform
2. Understand appointment options and booking processes
3. Find available time slots
4. Understand their current queue status or estimate waiting times
5. Guide them smoothly through booking an appointment

CRITICAL RULES:
- NEVER diagnose medical conditions.
- NEVER determine or assign medical urgency.
- NEVER decide medical priority.
- NEVER act as a replacement for human staff or doctors.
- For any medical inquiries, clearly state that you are an administrative assistant and they must consult the appropriate medical staff.
- Keep your responses friendly, professional, and concise.
- QueueLess is the platform name.

CURRENT SYSTEM CONTEXT (Use this to answer user questions):
${contextStr}
`;

exports.chat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ 
        message: "AI assistance is temporarily unavailable. Please try again." 
      });
    }

    // Build context
    let contextStr = "Available Organizations and Services:\n";
    try {
      const orgs = await Organization.find({ isActive: true });
      const services = await Service.find().populate('organization', 'name');
      
      orgs.forEach(o => {
        contextStr += `- ${o.name} (${o.type}) in ${o.address?.city || 'Unknown'}. Services: `;
        const orgServices = services.filter(s => s.organization && s.organization._id.toString() === o._id.toString());
        contextStr += orgServices.map(s => `${s.name} (${s.type})`).join(', ') + '\n';
      });

      if (req.user) {
        contextStr += `\nUser's Active Queues:\n`;
        const activeQueues = await QueueEntry.find({ 
          customer: req.user._id, 
          status: { $in: ['waiting', 'called', 'serving'] } 
        }).populate('service', 'name estimatedDuration');
        
        if (activeQueues.length > 0) {
          for (const q of activeQueues) {
            const statusObj = await queueService.getQueueStatus(q._id);
            contextStr += `- Waiting for ${q.service?.name}. Status: ${q.status}. Token: ${q.tokenNumber}. People Ahead: ${statusObj.peopleAhead}. Estimated Wait: ${statusObj.estimatedWaitTime} mins.\n`;
          }
        } else {
          contextStr += `User is not currently in any queues.\n`;
        }
      }
    } catch (e) {
      console.error("Error building context:", e);
      contextStr += "(Could not load full system context)";
    }

    const ai = new GoogleGenAI({ apiKey });

    let conversationText = "";
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }
    conversationText += `User: ${message}\nAssistant:`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: conversationText,
        config: {
          systemInstruction: getSystemInstruction(contextStr),
          temperature: 0.3,
        }
      });

      if (!response || !response.text) {
        throw new Error("Empty response from AI");
      }

      res.json({ reply: response.text.trim() });

    } catch (apiError) {
      console.error("Gemini API Error:", apiError);
      if (apiError.status === 429) {
        return res.status(429).json({ message: "I'm receiving too many requests right now. Please give me a moment and try again." });
      }
      throw new Error("API communication failed");
    }

  } catch (error) {
    console.error("AI Controller Error:", error);
    res.status(500).json({ message: "AI assistance is temporarily unavailable. Please try again." });
  }
};
