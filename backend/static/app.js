/* ICON HELPER */
function icon(channel) {
    switch ((channel || "").toLowerCase()) {
        case "sms": return "📩";
        case "email": return "📧";
        case "push": return "📱";
        case "whatsapp": return "💬";
        case "inbox": return "📥";
        default: return "🔔";
    }
}

function readableReason(r) {
    if (!r) return "";
    if (r.includes("forced_final_fallback"))
        return "Delivered via final fallback (Inbox) because all channels failed.";
    if (r.includes("retry_score"))
        return "Delivery failed due to high retry score.";
    return r.replace(/_/g, " ");
}

function eventTitle(eventType) {
    switch(eventType) {
        case "OTP": return "One-Time Passcode";
        case "Transaction OTP": return "Transaction Verification";
        case "Fraud Alert": return "Security Alert";
        case "Monthly Statement": return "Your Monthly Statement";
        case "Payment Confirmation": return "Payment Confirmation";
        default: return eventType;
    }
}

function eventDescription(eventType) {
    switch(eventType) {
        case "OTP": 
            return "Your OTP could not be delivered via SMS/Email and has been securely placed here.";
        case "Transaction OTP":
            return "We could not deliver your verification code. Please retrieve it from your Secure Inbox.";
        case "Fraud Alert":
            return "We attempted to notify you about a suspicious transaction. View this alert securely.";
        case "Monthly Statement":
            return "Your latest account statement is now available.";
        case "Payment Confirmation":
            return "Your payment confirmation has been delivered securely.";
        default:
            return "A new message has been delivered to your Secure Inbox.";
    }
}

function eventIcon(type) {
    switch(type) {
        case "OTP": return "🔐";
        case "Transaction OTP": return "🔐";
        case "Fraud Alert": return "⚠️";
        case "Monthly Statement": return "📄";
        case "Payment Confirmation": return "💳";
        default: return "📩";
    }
}

function getDateGroup(timestamp) {
    const d = new Date(timestamp);
    const today = new Date();
    
    const diff = today.setHours(0,0,0,0) - d.setHours(0,0,0,0);

    if (diff === 0) return "Today";
    if (diff === 86400000) return "Yesterday";
    return "Earlier";
}

function renderInboxCard(msg) {
    const icon = eventIcon(msg.event_type);
    const friendlyTitle = eventTitle(msg.event_type);
    const description = eventDescription(msg.event_type);

    return `
        <div class="secure-msg-card">
            <div class="msg-header">
                <span class="msg-icon">${icon}</span>
                <span class="msg-title">${friendlyTitle}</span>
            </div>

            <div class="msg-description">${description}</div>

            <div class="msg-meta">
                <span class="msg-date">${new Date(msg.timestamp).toLocaleString()}</span>
                <span class="msg-badge">Secure Inbox</span>
            </div>
        </div>
    `;
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;

    // Color variations
    if (type === "error") toast.style.background = "#e74c3c";
    else toast.style.background = "#4A90E2";

    toast.classList.add("show");

    // Auto-hide
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* TAB SWITCHING */
const tabs = document.querySelectorAll(".tab-btn");
const contents = document.querySelectorAll(".tab-content");

tabs.forEach(btn => {
    btn.addEventListener("click", () => {
        let tab = btn.getAttribute("data-tab");

        tabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        contents.forEach(c => {
            c.classList.remove("active");
            c.style.display = "none";
        });

        const selectedTab = document.getElementById(tab);
        selectedTab.classList.add("active");
        selectedTab.style.display = "block";

    });
});

document.addEventListener("DOMContentLoaded", () => {
    const firstTab = document.querySelector(".tab-btn");
    if (firstTab) {
        firstTab.click();
    }
});

// METADATA SHOW/HIDE BUTTON
document.getElementById("toggleMetadataBtn").addEventListener("click", () => {
    const panel = document.getElementById("metadataPanel");
    const btn = document.getElementById("toggleMetadataBtn");

    if (panel.style.display === "none") {
        panel.style.display = "block";
        btn.textContent = "Hide";
    } else {
        panel.style.display = "none";
        btn.textContent = "Show";
    }
});


/* SEND NOTIFICATION HANDLER */
document.getElementById("sendBtn").addEventListener("click", async () => {
    const eventType = document.getElementById("eventType").value;
    const responseBox = document.getElementById("responseBox");
    const primaryEl = document.getElementById("primaryChannel");
    const retryScoreEl = document.getElementById("retryScore");
    const retryPercentEl = document.getElementById("retryPercent");

    const demoEnabled = document.getElementById("demoToggle").checked;

    responseBox.textContent = "Sending...";

    try {

        const res = await fetch("/send", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                event_type: eventType,
                demo_mode: demoEnabled ? "force_primary_fail" : null
            })

        });

        const json = await res.json();
        responseBox.textContent = JSON.stringify(json, null, 2);
        showToast("Notification sent successfully!");
        

        if (json.notification) {
            primaryEl.textContent =
                icon(json.notification.primary_channel) + " " +
                json.notification.primary_channel;

            retryScoreEl.textContent = json.notification.retry_score;
            retryPercentEl.textContent = json.notification.retry_percentage + "%";

            const panel = document.getElementById("metadataPanel");
            const toggleBtn = document.getElementById("toggleMetadataBtn");

            if (panel.style.display === "none") {
                panel.style.display = "block";
                toggleBtn.textContent = "Hide";
            }

        }

        /* RENDER TIMELINE */
        if (json.notification && json.notification.attempts) {
            const attempts = json.notification.attempts;
            let html = "";

            attempts.forEach((a, i) => {
                const color = a.status === "SUCCESS" ? "green" : "red";

                html += `
                    <div style="
                        margin-bottom:10px;
                        padding:10px;
                        border-left: 4px solid ${color};
                        background:#fff;
                        border-radius:6px;
                        font-family:monospace;
                    ">
                        <div style="font-weight:bold; color:${color}">
                            ${icon(a.channel)} Attempt ${i+1} — ${a.channel}: ${a.status}
                        </div>
                        <div style="opacity:0.75; font-size:13px; margin-top:3px;">
                            ${readableReason(a.reason)}
                        </div>
                    </div>
                `;
            });

            document.getElementById("attemptsBox").innerHTML = html;
        }

    } catch (err) {
        responseBox.textContent = "Error: " + err.message;
        showToast("Failed to send notification", "error");
    }
});

/* --- FULL FEATURED SECURE INBOX --- */

document.getElementById("loadInboxBtn").addEventListener("click", loadInbox);
document.getElementById("searchInbox").addEventListener("input", loadInbox);

// Clear inbox button
document.getElementById("clearInboxBtn").addEventListener("click", async () => {
    await fetch("/clear_inbox", { method: "POST" });
    document.getElementById("inboxBox").innerHTML = "<p>Inbox cleared.</p>";
});

/* LOAD TRASH HANDLER */
document.getElementById("loadTrashBtn").addEventListener("click", async () => {
    const trashBox = document.getElementById("trashBox");
    trashBox.innerHTML = "Loading trash...";

    const res = await fetch("/trash");
    const json = await res.json();

    let html = "";

    json.trash.forEach(msg => {
        html += `
            <div class="secure-msg-card">
                <div class="msg-header">
                    🗑️ Deleted: ${msg.event_type}
                </div>

                <div class="msg-description">
                    Originally delivered via: ${msg.delivered_via}
                </div>

                <button class="inbox-btn" onclick="restoreMessage('${msg.notification_id}')">
                    ♻️ Restore
                </button>
            </div>
        `;
    });

    trashBox.innerHTML = html || "(Trash Empty)";
});

/* RESTORE MESSAGE FUNCTION */
async function restoreMessage(id) {
    await fetch("/restore_message", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ notification_id: id })
    });

    showToast("Message restored!");
    document.getElementById("loadTrashBtn").click();
}

/* EMPTY TRASH HANDLER */
document.getElementById("emptyTrashBtn").addEventListener("click", async () => {
    await fetch("/empty_trash", { method: "POST" });
    showToast("Trash emptied!");

    document.getElementById("trashBox").innerHTML = "(Trash Empty)";
});

async function loadInbox() {
    const inboxBox = document.getElementById("inboxBox");
    const query = document.getElementById("searchInbox").value.toLowerCase();

    inboxBox.innerHTML = `
        <div style="
            padding:20px;
            text-align:center;
            font-size:14px;
            opacity:0.7;
        ">
            <span class="loader"></span> Loading your secure messages...
        </div>
    `;

    const res = await fetch("/inbox");
    const json = await res.json();
    let inbox = json.inbox || [];

    // SORT newest → oldest
    inbox.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // SEARCH FILTER
    if (query) {
        inbox = inbox.filter(msg =>
            msg.event_type.toLowerCase().includes(query)
        );
    }

    // GROUP BY DATE
    const groups = { "Today": [], "Yesterday": [], "Earlier": [] };

    inbox.forEach(msg => {
        const group = getDateGroup(msg.timestamp);
        groups[group].push(msg);
    });

    // RENDER
    let html = "";

    for (const groupName of ["Today", "Yesterday", "Earlier"]) {
        if (groups[groupName].length === 0) continue;

        html += `<h3 class="group-title">${groupName}</h3>`;

        groups[groupName].forEach(msg => {
            html += renderInboxCard(msg);
        });
    }

    inboxBox.innerHTML = html || "<p>No messages found.</p>";
}


