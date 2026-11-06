const formStatus = new URLSearchParams(window.location.search).get("form-status");
if (formStatus === "success" || formStatus === "error") {
  const form = document.querySelector("form[data-form-type]");
  const status = form && form.querySelector(".form-status");

  if (status) {
    status.dataset.state = formStatus;
    status.textContent = formStatus === "success"
      ? "Thanks! Your submission was received."
      : "Your submission could not be sent. Please check the form and try again.";
    status.hidden = false;
    window.history.replaceState(null, "", window.location.pathname);
  }
}

for (const form of document.querySelectorAll("form[data-form-type]")) {
  const status = form.querySelector(".form-status");
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = submitButton.textContent;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.hidden = true;
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("We couldn’t process the response. Please try again.");
      }

      if (!response.ok) {
        throw new Error(result.error || "Your submission could not be sent. Please try again.");
      }

      form.reset();
      status.dataset.state = "success";
      status.textContent = result.message;
      status.hidden = false;
    } catch (error) {
      status.dataset.state = "error";
      status.textContent = error.message || "A network error occurred. Please try again.";
      status.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  });
}
