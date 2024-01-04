import { marked } from "marked";

class Journal {
  isInitialRequest = true;
  initialPrompt = `You are a good friend.  Address the user as "you". Provide each of the following bullet points for the user's Text Entry:

    *Provide a brief empathic summarization using Rogerian person-centered reflective listening skills [50 words or less].  Call it a Summary.
    
    *2-3 Words to describe the mood.  Choose only from the following list: [Happy,Joyful,Excited,Content,Grateful,Loved,Peaceful,Hopeful,Inspired,Neutral,Calm,Relaxed,Focused,
    Curious,Surprised,Thoughtful,Reflective,Indifferent,Ambivalent,Sad,Angry,Anxious,Fearful,Frustrated,Lonely,Guilty,Ashamed,Hurt],
    
    *Positive things said using bullet points,
    
    *Negative things said using bullet points,
    
    *Activities mentioned using bullet points otherwise write None.
    
    User's Text Entry: `;

  followUpPrompt = `You speaking directly to your good friend about logging their sleep and fatigue. Directly respond to the user in a chat interface, using a prose writing style without any section headings. Do not talk about yourself.
    First, provide some words of motivation based on the users log. [50 words or less]

      Next, ask some questions [maximum 3 questions] to add more detail to their workout log to help fill out any missing topics. The log should provide enough detail to complete the following form:
    * How difficult it was for them to fall asleep
    * Whether they woke up at night
    * How rested they felt in the morning
    * How energized they are feeling during the day

    Here is the journal entry to reference: `;

  init() {
    // Listen for "send" click and hit Palm API.
    document
      .querySelector(".send-message-button")
      ?.addEventListener("click", (e) => this.send(e));

    // Listen for enter key and hit Palm API.
    document.querySelector("#text-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.send(e);
    });

    // Listen for mic click and start speech recognition.
    document
      .querySelector(".mic-button")
      ?.addEventListener("click", this.startSpeechRecognition);
  }

  async submitFeedback(event, feedbackType) {
    console.log("submitting feedback...");
    const container = event.target.closest(".msg-container");
    const req = container.querySelector(".hidden-req")?.textContent;
    const response = container.querySelector(".bubble span")?.textContent;

    let formData = new FormData();
    formData.append("Date", Date.now() + "");
    formData.append("Request", req);
    formData.append("Response", response);
    formData.append("Feedback", feedbackType);
    console.log("sending feedbackData:", formData);

    const appScript =
      "https://script.google.com/macros/s/AKfycbyc8Y7G9HvGjEoXRO2UXCmhQ03vq0BSAlmXyU4qNteFT8WcWzpZZAgwT76ZcDI4MfpFww/exec";

    const postreq = await fetch(appScript, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });
    // No response expected due to no-cors mode.
    console.log("postreq:", postreq);
  }

  startSpeechRecognition() {
    console.log("starting speech recognition...");
    document
      .querySelector("#text-input")!
      .setAttribute("placeholder", "Listening...");
    const recognition = new webkitSpeechRecognition();
    recognition.start();
    recognition.onresult = (event) => {
      console.log("event:", event);
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      console.log("transcript:", transcript);
      document.querySelector("#text-input")!.value = transcript;
      recognition.stop();
    };
  }

  async send(e) {
    e.preventDefault();
    const text = document.querySelector("#text-input")?.value;
    if (!text || !text.trim()) {
      alert("Please enter a message to send.");
      return;
    }

    this.renderUserMessage(text);

    const apiKey = "AIzaSyCV0UAX1Gaw4w5u_cDFfq2u3tKIEcKHjRQ";
    const apiUrl =
      "https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key=" +
      apiKey;

    const pretext = this.isInitialRequest ? this.initialPrompt : this.followUpPrompt;
    const requestData = {
      prompt: {
        text: pretext + text,
      },
    };

    this.isInitialRequest = false;
    console.log("sending message...", requestData);
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
    console.log("response:", response);
    const data = await response.json();
    console.log("data:", data);
    // todo: handle error response
    try {
      const responseText = data["candidates"][0]["output"];
      this.renderPalmResponse(responseText, text);
    } catch (e) {
      this.renderPalmResponse(e, text);
    }
  }

  renderUserMessage = (text) => {
    const template = document
      .querySelector(".msg-container.user")
      ?.cloneNode(true) as HTMLElement;
    template.classList.remove("hidden");
    template.querySelector(".bubble span")!.textContent = text;
    document.querySelector(".board")?.appendChild(template);

    // Clear input field.
    document.querySelector("#text-input")!.value = "";
  };

  renderPalmResponse = (response, req) => {
    console.log("rendering palm response:", response);
    const template = document
      .querySelector(".msg-container.palm")
      ?.cloneNode(true) as HTMLElement;
    template.querySelector(".bubble span")!.innerHTML = marked.parse(response);
    template.querySelector(".hidden-req")!.textContent = req;

    // Listen for feedback click and submit form data.
    template
      .querySelector("button.positive")
      ?.addEventListener("click", (e) => this.submitFeedback(e, "positive"));
    template
      .querySelector("button.negative")
      ?.addEventListener("click", (e) => this.submitFeedback(e, "negative"));

    // insert into board.
    document.querySelector(".board")?.appendChild(template);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const journal = new Journal();
  journal.init();
});
