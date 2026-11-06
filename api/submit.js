const SERVICES = new Set(["web-dev", "software-design", "consultation"]);
const MAX_BODY_BYTES = 16 * 1024;

function sendJson(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}

function getText(value, maxLength) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function getSubmission(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const type = body.formType;
  const name = getText(type === "contact" ? body.name : body.fullname, 120);
  const email = getText(body.email, 254);

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  if (type === "contact") {
    const message = getText(body.message, 5000);
    return message ? { table: "contact_submissions", row: { name, email, message } } : null;
  }

  if (type === "registration" && SERVICES.has(body.service)) {
    return {
      table: "registration_submissions",
      row: { full_name: name, email, service: body.service },
    };
  }

  return null;
}

function redirectForm(res, formType, result) {
  const page = formType === "registration" ? "registration-form.html" : "contact.html";
  res.statusCode = 303;
  res.setHeader("Location", `/${page}?form-status=${result}`);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

function respond(res, wantsJson, formType, status, payload) {
  if (wantsJson) {
    sendJson(res, status, payload);
    return;
  }

  if (status >= 200 && status < 300) {
    redirectForm(res, formType, "success");
    return;
  }

  redirectForm(res, formType, "error");
}

module.exports = async function submit(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json") && !contentType.includes("application/x-www-form-urlencoded")) {
    sendJson(res, 415, { error: "Submit the form using the supported form encoding." });
    return;
  }

  const declaredBodySize = Number(req.headers["content-length"]);
  const bodySize = Number.isFinite(declaredBodySize) && declaredBodySize > 0
    ? declaredBodySize
    : Buffer.byteLength(JSON.stringify(req.body || {}));
  if (bodySize > MAX_BODY_BYTES) {
    sendJson(res, 413, { error: "The submission is too large." });
    return;
  }

  const body = req.body;
  const formType = body && body.formType;
  const wantsJson = (req.headers.accept || "").includes("application/json");
  const submission = getSubmission(body);

  if (!submission) {
    respond(res, wantsJson, formType, 400, { error: "Check the form fields and try again." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Form submission configuration is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    respond(res, wantsJson, formType, 503, { error: "The form is temporarily unavailable. Please try again later." });
    return;
  }

  let restUrl;
  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
      throw new Error("Supabase URL must use HTTPS.");
    }
    restUrl = `${parsedUrl.origin}/rest/v1/${submission.table}`;
  } catch (error) {
    console.error("SUPABASE_URL is invalid:", error.message);
    respond(res, wantsJson, formType, 503, { error: "The form is temporarily unavailable. Please try again later." });
    return;
  }

  try {
    const result = await fetch(restUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(submission.row),
      signal: AbortSignal.timeout(10000),
    });

    if (!result.ok) {
      console.error("Supabase rejected a form submission:", result.status, result.statusText);
      respond(res, wantsJson, formType, 502, { error: "We couldn’t save your submission. Please try again later." });
      return;
    }
  } catch (error) {
    console.error("Supabase form submission failed:", error.message);
    respond(res, wantsJson, formType, 502, { error: "We couldn’t save your submission. Please try again later." });
    return;
  }

  respond(res, wantsJson, formType, 200, { message: "Thanks! Your submission was received." });
};
