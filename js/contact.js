/* Appointment form: nothing is sent to a server. The details only go into a WhatsApp message
 * that the visitor reviews and sends themselves. Inputs are trimmed, length-capped and cleaned. */
(function () {
    var form = document.getElementById("apptForm"), btn = document.getElementById("apptSend");
    if (!form || !btn) return;
    var LIMIT = { name: 80, phone: 20, date: 10, time: 5, reason: 500 };
    function clean(id) {
        var el = document.getElementById(id); if (!el) return "-";
        var v = String(el.value || "")
            .replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "") // control & direction-override chars
            .replace(/[*_~`]/g, "")                                                              // WhatsApp formatting marks
            .trim().slice(0, LIMIT[id] || 200);
        if (id === "phone") v = v.replace(/[^0-9+\-\s()]/g, "");
        return v || "-";
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    btn.addEventListener("click", function () {
        var phone = document.getElementById("phone");
        if (phone && phone.value && !phone.checkValidity()) { phone.reportValidity(); return; }
        var msg = "Appointment request, Klinik Dr. Al Baghdadi\n\n" +
            "*Name:* " + clean("name") + "\n*Phone / WhatsApp:* " + clean("phone") + "\n*Preferred date:* " + clean("date") +
            "\n*Preferred time:* " + clean("time") + "\n*Reason:* " + clean("reason");
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "borang_whatsapp" });
        window.open("https://wa.me/60103434711?text=" + encodeURIComponent(msg), "_blank", "noopener,noreferrer");
    });
})();
