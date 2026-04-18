const express = require("express");
const router = express.Router();

router.post("/chat", (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  let reply = "";
  let urgency = "Monitor";

  const msg = message.toLowerCase();

  if (msg.includes("start") || msg.includes("click")) {
    reply = "This may be a battery or starter issue.";
    urgency = "Immediate";
  } else if (msg.includes("brake")) {
    reply = "Brake issues are serious. Check immediately.";
    urgency = "Immediate";
  } else if (msg.includes("oil")) {
    reply = "Check oil levels soon.";
    urgency = "Within a Week";
  } else {
    reply = "Monitor the issue and consult a mechanic if needed.";
    urgency = "Monitor";
  }

  res.json({
    reply,
    urgency,
    disclaimer: "Not a professional diagnosis."
  });
});

module.exports = router;