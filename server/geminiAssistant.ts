import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export interface AssistantConverseRequest {
  message: string;
  history?: Array<{ sender: 'user' | 'assistant'; text: string }>;
  currentContext: Record<string, any>;
  bookingType: 'TRAIN' | 'BUS' | 'MOVIE' | null;
  language: string; // 'en' | 'ta' | 'te' | 'ml' | 'kn' | 'hi'
  availableData?: {
    trains?: any[];
    buses?: any[];
    cinemas?: any[];
    movies?: any[];
  };
}

export interface AssistantConverseResponse {
  replyText: string;
  action: string;
  bookingType: 'TRAIN' | 'BUS' | 'MOVIE' | null;
  extractedSlots: Record<string, any>;
  correctedFields?: string[];
  filterPreferences?: {
    maxPrice?: number | null;
    isCheapest?: boolean | null;
    operator?: string | null;
    busType?: string | null;
    timePreference?: string | null;
    seatPreference?: string | null;
  };
  isComplete?: boolean;
}

export async function processConversationalTurn(
  payload: AssistantConverseRequest
): Promise<AssistantConverseResponse | null> {
  const ai = getAIClient();
  if (!ai) {
    return null;
  }

  const { message, history = [], currentContext, bookingType, language, availableData } = payload;

  const todayStr = new Date().toISOString().split('T')[0];

  const systemInstruction = `You are "Silver Travel AI", an empathetic, exceptionally intelligent, and natural conversational travel agent for India.
You converse fluently in English, Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ), and Hindi (हिंदी).

Today's date is: ${todayStr}.

CORE OBJECTIVE:
Act like a true human travel agent:
1. Understand natural speech, intent, and entities extracted in ANY order (e.g. "I need a sleeper bus from Chennai to Madurai tomorrow evening under 800 rupees").
2. Remember existing context. NEVER ask for information that has already been provided or inferred.
3. Identify what is genuinely missing to progress the booking.
4. Support corrections seamlessly (e.g. if user says "Actually make it Trichy" or "Change date to Sunday", update the destination/date and reset dependent choices if needed).
5. Support mode switches (e.g. "Show me trains instead" -> switch to TRAIN, keep source, destination, date).
6. Strict Context Isolation:
   - TRAIN: Needs source station/city, destination station/city, date, train choice, class (SL, 3A, 2A, 1A), berth preference (Lower, Upper, Middle, Side Lower, Side Upper), passenger details (name, age, gender, mobile, aadhaar).
   - BUS: Needs source city, destination city, date, bus choice/operator, boarding point, seat type (Window, Aisle, Sleeper, Semi-Sleeper), passenger details (name, age, gender, mobile). NEVER ask train berth questions for buses.
   - MOVIE: Needs movie name, city, cinema theatre, show date, showtime, ticket count, seat category (Regular, Premium, Gold, Recliner), seat numbers. NEVER ask train berth or bus boarding questions for movies.
7. Real Grounded Data:
   - Available options (buses, trains, cinemas) for the route/city are provided in context.
   - When the user asks for budget ("under 700 rupees", "cheapest option", "Volvo AC", "fastest train"), reference the real options provided.
   - If no option is strictly under the requested price, explain clearly and recommend the closest available option with its exact price.
8. Spoken Response Quality:
   - Generate "replyText" in the requested language (${language}) using the appropriate script (Tamil script for 'ta', Telugu script for 'te', Malayalam script for 'ml', Kannada script for 'kn', Devanagari for 'hi', English for 'en').
   - Keep replyText concise, warm, professional, and ideal for Text-to-Speech (1 to 2 short sentences).
   - Acknowledge provided details and ask only the single most relevant next question or guide them to the next step.

JSON Output Schema:
Return ONLY valid JSON matching this structure:
{
  "bookingType": "TRAIN" | "BUS" | "MOVIE" | null,
  "extractedSlots": {
    "from_station": string | null,
    "to_station": string | null,
    "from_city": string | null,
    "to_city": string | null,
    "date": string | null, // YYYY-MM-DD
    "passenger_count": number | null,
    "ticket_count": number | null,
    "passengerName": string | null,
    "passengerAge": number | null,
    "passengerGender": string | null,
    "passenger_mobile": string | null,
    "passenger_aadhaar": string | null,
    "selected_train": string | null,
    "selected_class": string | null,
    "seat_preference": string | null,
    "selected_bus": string | null,
    "boarding_point": string | null,
    "seat_type": string | null,
    "movie_name": string | null,
    "city": string | null,
    "selected_cinema": string | null,
    "selected_showtime": string | null,
    "selected_seats": string | null,
    "max_price": number | null,
    "time_preference": string | null,
    "operator_preference": string | null,
    "passengers": [
      { "name": string, "age": number, "gender": string }
    ] | null
  },
  "correctedFields": string[], // list of field names that were changed/corrected in this turn
  "action": "ASK_MISSING" | "SHOW_RESULTS" | "CONFIRM_SELECTION" | "COLLECT_PASSENGER" | "SHOW_SUMMARY" | "READY_FOR_PAYMENT" | "CLARIFY" | "SWITCH_MODE",
  "filterPreferences": {
    "maxPrice": number | null,
    "isCheapest": boolean | null,
    "operator": string | null,
    "busType": string | null,
    "timePreference": string | null,
    "seatPreference": string | null
  },
  "replyText": string
}`;

  const prompt = `Current Context:
Booking Type: ${bookingType || 'Not chosen yet'}
Language: ${language}
Current Slots: ${JSON.stringify(currentContext, null, 2)}
Available Real Data on Route: ${JSON.stringify(availableData || {}, null, 2)}

Recent Conversation History:
${history.slice(-6).map(h => `${h.sender.toUpperCase()}: ${h.text}`).join('\n')}

LATEST USER MESSAGE:
"${message}"

Analyze the user's intent, extract or correct entities, filter or ground with available data, decide the next action, and respond naturally in ${language}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      return null;
    }

    const parsed: AssistantConverseResponse = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error('[GEMINI ASSISTANT] Error processing turn:', error);
    return null;
  }
}
