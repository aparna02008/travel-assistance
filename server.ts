import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { processConversationalTurn } from "./server/geminiAssistant";

interface BookingEvent {
  id: string;
  user: string;
  type: 'TRAIN' | 'BUS' | 'MOVIE';
  title: string;
  from: string;
  to: string;
  timestamp: string;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Support JSON POST bodies
  app.use(express.json());

  // In-memory active bookings log for newly connected clients
  const activeBookingsFeed: BookingEvent[] = [
    {
      id: "feed-1",
      user: "Rohan K.",
      type: "TRAIN",
      title: "Tamil Nadu Express",
      from: "MAS",
      to: "SBC",
      timestamp: "Just now"
    },
    {
      id: "feed-2",
      user: "Priya S.",
      type: "MOVIE",
      title: "Interstellar",
      from: "Mumbai",
      to: "Mumbai",
      timestamp: "2 min ago"
    },
    {
      id: "feed-3",
      user: "Vikram R.",
      type: "BUS",
      title: "KPN Travels AC Sleeper",
      from: "Chennai",
      to: "Bangalore",
      timestamp: "5 min ago"
    }
  ];

  // Random Indian names for generating real-time community activity
  const randomNames = ["Ananya M.", "Rajesh P.", "Kabir S.", "Meera N.", "Siddharth J.", "Sneha G.", "Arjun K.", "Shalini V.", "Gaurav T.", "Diya A."];
  const randomTrains = ["Tamil Nadu Express (12163)", "Rajdhani Express (12424)", "Shatabdi Express (12002)", "Duronto Express (12260)"];
  const randomBuses = ["KPN Travels Volvo AC", "SRS Travels Multi-Axle", "VRL Travels Sleeper", "National Travels"];
  const randomMovies = ["Interstellar", "Inception", "Gladiator II", "Pushpa 2", "Kanguva", "Dune: Part Two"];
  const cities = ["Chennai", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Kolkata", "Pune"];

  // Setup WebSocket Server attached to the HTTP server
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade manually
  server.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    console.log(`[SERVER] Upgrade request received for path: "${pathname}"`);

    if (pathname === '/api/ws-booking') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      console.log(`[SERVER] Ignoring upgrade request for unknown path: "${pathname}"`);
      // Do not destroy the socket in case Vite's HMR or other system tools want to upgrade it.
    }
  });

  // Keep track of active clients
  const activeClients = new Set<WebSocket>();

  const broadcastToAll = (payload: any) => {
    const dataString = JSON.stringify(payload);
    activeClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(dataString);
      }
    });
  };

  wss.on("connection", (ws: WebSocket) => {
    activeClients.add(ws);
    console.log(`[WS] Client connected. Total active: ${activeClients.size}`);

    // Send initial greeting with current system stats and recent feed
    ws.send(JSON.stringify({
      type: "WELCOME",
      data: {
        activeUsers: activeClients.size + 12, // add some offset for active agent realism
        feed: activeBookingsFeed,
        timestamp: new Date().toISOString()
      }
    }));

    // Broadcast updated presence to all other clients
    broadcastToAll({
      type: "PRESENCE_UPDATE",
      data: {
        activeUsers: activeClients.size + 12
      }
    });

    ws.on("message", (message: string) => {
      try {
        const payload = JSON.parse(message);
        console.log("[WS] Received payload:", payload);

        if (payload.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG" }));
          return;
        }

        if (payload.type === "BOOKING_MADE") {
          const newBooking: BookingEvent = {
            id: `feed-${Date.now()}`,
            user: payload.data.passengerName || "Guest User",
            type: payload.data.bookingType,
            title: payload.data.title,
            from: payload.data.from || "MAS",
            to: payload.data.to || "SBC",
            timestamp: "Just now"
          };

          // Store in feed
          activeBookingsFeed.unshift(newBooking);
          if (activeBookingsFeed.length > 20) {
            activeBookingsFeed.pop();
          }

          // Broadcast the actual booking to all clients
          broadcastToAll({
            type: "NEW_BOOKING_ALERT",
            data: newBooking
          });
        }

        if (payload.type === "CLIENT_VIEWING") {
          broadcastToAll({
            type: "COMMUNITY_ACTION",
            data: {
              text: `${payload.data.user || "A user"} is looking at ${payload.data.category.toLowerCase()} tickets right now.`
            }
          });
        }

      } catch (err) {
        console.error("[WS] Error processing message:", err);
      }
    });

    ws.on("close", () => {
      activeClients.delete(ws);
      console.log(`[WS] Client disconnected. Total active: ${activeClients.size}`);
      broadcastToAll({
        type: "PRESENCE_UPDATE",
        data: {
          activeUsers: activeClients.size + 12
        }
      });
    });
  });

  // Periodically generate dynamic background traffic (simulates other booking terminals across India in real-time)
  setInterval(() => {
    if (activeClients.size === 0) return;

    const bType = ["TRAIN", "BUS", "MOVIE"][Math.floor(Math.random() * 3)] as 'TRAIN' | 'BUS' | 'MOVIE';
    let title = "";
    let from = cities[Math.floor(Math.random() * cities.length)];
    let to = cities[Math.floor(Math.random() * cities.length)];
    while (to === from) {
      to = cities[Math.floor(Math.random() * cities.length)];
    }

    if (bType === "TRAIN") {
      title = randomTrains[Math.floor(Math.random() * randomTrains.length)];
    } else if (bType === "BUS") {
      title = randomBuses[Math.floor(Math.random() * randomBuses.length)];
    } else {
      title = randomMovies[Math.floor(Math.random() * randomMovies.length)];
      from = "Multiplex Cinema";
      to = "Multiplex Cinema";
    }

    const dynamicBooking: BookingEvent = {
      id: `dynamic-${Date.now()}`,
      user: randomNames[Math.floor(Math.random() * randomNames.length)],
      type: bType,
      title: title,
      from: from,
      to: to,
      timestamp: "Just now"
    };

    activeBookingsFeed.unshift(dynamicBooking);
    if (activeBookingsFeed.length > 20) {
      activeBookingsFeed.pop();
    }

    // Broadcast this real websocket message to the client
    broadcastToAll({
      type: "NEW_BOOKING_ALERT",
      data: dynamicBooking
    });

    // Also broadcast a seat depletion state to make selection highly real-time!
    broadcastToAll({
      type: "SEAT_FLUCTUATION",
      data: {
        category: bType,
        seatsLeft: Math.floor(Math.random() * 8) + 2,
        action: Math.random() > 0.5 ? "DEPLETE" : "REFRESH"
      }
    });

  }, 12000); // Trigger a cool live transport agency tick every 12 seconds!

  // Simple queue class to serialize asynchronous requests to ElevenLabs API and avoid rate/concurrency limits
  class RequestQueue {
    private queue: Promise<any> = Promise.resolve();

    async enqueue<T>(task: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        this.queue = this.queue.then(async () => {
          try {
            // Add a 500ms delay between voice generations to prevent overlapping/burst rate-limiting
            await new Promise((r) => setTimeout(r, 500));
            const result = await task();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }).catch(() => {});
      });
    }
  }

  const speakQueue = new RequestQueue();

  // ElevenLabs Secure TTS Proxy Route
  app.post("/api/speak", async (req, res) => {
    const { text, language } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Bella voice (Free pre-made voice supported on free plan API keys)
    const apiKey = process.env.ELEVENLABS_KEY || process.env.VITE_ELEVENLABS_KEY || "sk_c4356a11531b36bf24bd70fd7ed9563d672b285528d488a3";

    try {
      console.log(`[SERVER] Received speech request: "${text.slice(0, 40)}..."`);
      
      // Enqueue the ElevenLabs API request so it runs sequentially
      const buffer = await speakQueue.enqueue(async () => {
        console.log(`[SERVER] Executing serialized ElevenLabs request for: "${text.slice(0, 30)}..."`);
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg"
            },
            body: JSON.stringify({
              text: text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true
              }
            })
          }
        );

        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(errMsg);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      });

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache"
      });
      res.send(buffer);
    } catch (err: any) {
      console.error("[SERVER] speak proxy error:", err);
      res.status(500).json({ error: err.message || "Proxy error" });
    }
  });

  // Conversational AI Travel Agent Assistant Endpoint
  app.post("/api/assistant/converse", async (req, res) => {
    try {
      const { message, history, currentContext, bookingType, language, availableData } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'message' parameter" });
      }

      console.log(`[ASSISTANT] Processing conversational query: "${message.slice(0, 50)}..." [Lang: ${language || 'en'}]`);

      const result = await processConversationalTurn({
        message,
        history: history || [],
        currentContext: currentContext || {},
        bookingType: bookingType || null,
        language: language || 'en',
        availableData: availableData || {}
      });

      if (!result) {
        return res.status(503).json({ error: "AI Assistant temporarily unavailable, fallback required" });
      }

      return res.json(result);
    } catch (err: any) {
      console.error("[SERVER] Assistant conversational route error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // API Health Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", activeUsers: activeClients.size + 12 });
  });

  // Vite development integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Full-stack Silver Travel AI is listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[FATAL SERVER ERROR]", err);
  process.exit(1);
});
