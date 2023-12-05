import { marked } from "marked";

class Journal {
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

    const feedbackData = {
      request: req,
      response: response,
      feedbackType: feedbackType,
    };
    console.log("sending feedbackData:", feedbackData);

    const postreq = await fetch(
      "https://script.google.com/macros/s/AKfycbx3WJS1pZvvqYvYb_MspyX8eM3KeU6JwjZJUahCFw9VZnLF_yxSe8VYMRmK01qk-DbPew/exec",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("postreq:", postreq, await postreq.json());
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
    console.log("sending message...");
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

    const requestData = {
      prompt: {
        text: text,
      },
    };

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
    this.renderPalmResponse(data["candidates"][0]["output"], text);
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
