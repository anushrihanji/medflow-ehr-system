"""
EHR System — Flask Backend
Loads data from ehr_data.json (converted from the uploaded Excel workbook)
and serves the login + dashboard experience for Patients and Doctors.
"""
import json
import os
from datetime import datetime
from flask import Flask, render_template, jsonify, request, session, redirect, url_for

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "ehr_data.json")

app = Flask(__name__)
app.secret_key = "ehr-dev-secret-key-change-in-production"

# ---------------------------------------------------------------------------
# Load data once at startup
# ---------------------------------------------------------------------------
with open(DATA_PATH, "r") as f:
    DB = json.load(f)

PATIENTS = DB["Patients"]
APPOINTMENTS = DB["Appointments"]
MEDICAL_HISTORY = DB["Medical_History"]
PRESCRIPTIONS = DB["Prescriptions"]
LAB_RESULTS = DB["Lab_Results"]
BILLING = DB["Billing"]
CDS = DB["Clinical_Decision_Support"]
CARE_COORD = DB["Care_Coordination"]
AUDIT_LOG = DB["Security_Audit_Log"]
REPORTING = DB["Reporting_Analytics"]

# Progress label -> percentage band (used by the "Tracking Progress" module)
PROGRESS_MAP = {
    "Poor": 25,
    "Fair": 50,
    "Stable": 65,
    "Good": 85,
}

DOCTORS = sorted(set(p["Assigned Doctor"] for p in PATIENTS if p.get("Assigned Doctor")))

# ---------------------------------------------------------------------------
# Demo credentials
# Patient login uses Patient ID as username; Doctor login uses doctor name.
# Passwords are simple demo values — masked on the UI, never sent back in
# plaintext from any API other than the login check.
# ---------------------------------------------------------------------------
PATIENT_PASSWORD = "patient123"
DOCTOR_PASSWORD = "doctor123"


def progress_percent(label):
    return PROGRESS_MAP.get(label, 40)


def find_patient(patient_id):
    return next((p for p in PATIENTS if p["Patient ID"] == patient_id), None)


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@app.route("/")
def welcome():
    # Don't clear an active session just because the user navigated/back-
    # buttoned to "/" — only show the login form if nobody is signed in.
    if "role" in session:
        return redirect(url_for("dashboard"))
    return render_template("welcome.html")


@app.route("/api/patient_ids")
def api_patient_ids():
    """Used to populate the patient picker on the login screen."""
    ids = [{"id": p["Patient ID"], "name": p["Full Name"]} for p in PATIENTS]
    return jsonify(ids)


@app.route("/api/doctor_names")
def api_doctor_names():
    return jsonify(DOCTORS)


@app.route("/api/login", methods=["POST"])
def api_login():
    payload = request.get_json(force=True)
    role = payload.get("role")
    identifier = payload.get("identifier")
    password = payload.get("password")

    if role == "patient":
        patient = find_patient(identifier)
        if not patient or password != PATIENT_PASSWORD:
            return jsonify({"success": False, "message": "Invalid Patient ID or password."}), 401
        session["role"] = "patient"
        session["patient_id"] = patient["Patient ID"]
        session["display_name"] = patient["Full Name"]
        return jsonify({"success": True, "redirect": url_for("dashboard")})

    if role == "doctor":
        if identifier not in DOCTORS or password != DOCTOR_PASSWORD:
            return jsonify({"success": False, "message": "Invalid Doctor name or password."}), 401
        session["role"] = "doctor"
        session["doctor_name"] = identifier
        session["display_name"] = identifier
        return jsonify({"success": True, "redirect": url_for("dashboard")})

    return jsonify({"success": False, "message": "Unknown role."}), 400


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("welcome"))


# ---------------------------------------------------------------------------
# Dashboard shell
# ---------------------------------------------------------------------------
def require_login():
    return "role" in session


@app.route("/dashboard")
def dashboard():
    if not require_login():
        return redirect(url_for("welcome"))
    return render_template(
        "dashboard.html",
        role=session["role"],
        display_name=session["display_name"],
    )


# ---------------------------------------------------------------------------
# Module 1: Patient health data (EHR summary)
# ---------------------------------------------------------------------------
@app.route("/api/health_data")
def api_health_data():
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401

    if session["role"] == "patient":
        pid = session["patient_id"]
        patient = find_patient(pid)
        history = [h for h in MEDICAL_HISTORY if h["Patient ID"] == pid]
        labs = [l for l in LAB_RESULTS if l["Patient ID"] == pid]
        return jsonify({"patient": patient, "history": history, "labs": labs})

    doctor = session["doctor_name"]
    my_patient_ids = [p["Patient ID"] for p in PATIENTS if p["Assigned Doctor"] == doctor]
    patients = [p for p in PATIENTS if p["Patient ID"] in my_patient_ids]
    return jsonify({"patients": patients})


# ---------------------------------------------------------------------------
# Module 2: Electronic prescriptions
# ---------------------------------------------------------------------------
@app.route("/api/prescriptions")
def api_prescriptions():
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401

    if session["role"] == "patient":
        pid = session["patient_id"]
        rx = [r for r in PRESCRIPTIONS if r["Patient ID"] == pid]
    else:
        doctor = session["doctor_name"]
        rx = [r for r in PRESCRIPTIONS if r["Prescribing Doctor"] == doctor]
    return jsonify(rx)


# ---------------------------------------------------------------------------
# Module 3: Appointments / Booking list
# ---------------------------------------------------------------------------
@app.route("/api/appointments")
def api_appointments():
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401

    if session["role"] == "patient":
        pid = session["patient_id"]
        appts = [a for a in APPOINTMENTS if a["Patient ID"] == pid]
    else:
        doctor = session["doctor_name"]
        appts = [a for a in APPOINTMENTS if a["Doctor"] == doctor]
    return jsonify(appts)


@app.route("/api/appointments/<appointment_id>/booking_mode", methods=["POST"])
def api_set_booking_mode(appointment_id):
    """Patient selects how the appointment was booked (Phone / Online / Walk-In)
    and, if Rescheduled, supplies a reason. Doctors cannot call this — their
    view is read-only."""
    if not require_login() or session["role"] != "patient":
        return jsonify({"error": "unauthorized"}), 401

    payload = request.get_json(force=True)
    mode = payload.get("booking_mode")
    reason = payload.get("reschedule_reason", "")

    valid_modes = {"Phone", "Online", "Walk-In"}
    if mode not in valid_modes:
        return jsonify({"error": "invalid booking mode"}), 400

    for a in APPOINTMENTS:
        if a["Appointment ID"] == appointment_id and a["Patient ID"] == session["patient_id"]:
            a["Booking Mode"] = mode
            if a.get("Status") == "Rescheduled":
                a["Notes"] = reason or a.get("Notes")
            return jsonify({"success": True, "appointment": a})

    return jsonify({"error": "appointment not found"}), 404


# ---------------------------------------------------------------------------
# Module 4: Tracking patient progress and medical history
# ---------------------------------------------------------------------------
@app.route("/api/progress")
def api_progress():
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401

    if session["role"] == "patient":
        pid = session["patient_id"]
        records = [h for h in MEDICAL_HISTORY if h["Patient ID"] == pid]
    else:
        doctor = session["doctor_name"]
        records = [h for h in MEDICAL_HISTORY if h["Treating Doctor"] == doctor]

    out = []
    for r in records:
        out.append({**r, "progress_percent": progress_percent(r.get("Progress"))})
    return jsonify(out)


@app.route("/api/progress/<record_id>")
def api_progress_detail(record_id):
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401
    rec = next((h for h in MEDICAL_HISTORY if h["Record ID"] == record_id), None)
    if not rec:
        return jsonify({"error": "not found"}), 404
    rec = {**rec, "progress_percent": progress_percent(rec.get("Progress"))}
    return jsonify(rec)


# ---------------------------------------------------------------------------
# Other sheets, exposed for completeness (billing, CDS, care coordination,
# audit log, reporting) — scoped by role same as above.
# ---------------------------------------------------------------------------
@app.route("/api/billing")
def api_billing():
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401
    if session["role"] == "patient":
        pid = session["patient_id"]
        data = [b for b in BILLING if b["Patient ID"] == pid]
    else:
        doctor = session["doctor_name"]
        my_ids = [p["Patient ID"] for p in PATIENTS if p["Assigned Doctor"] == doctor]
        data = [b for b in BILLING if b["Patient ID"] in my_ids]
    return jsonify(data)


@app.route("/api/clinical_alerts")
def api_clinical_alerts():
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401
    if session["role"] == "patient":
        pid = session["patient_id"]
        data = [c for c in CDS if c["Patient ID"] == pid]
    else:
        doctor = session["doctor_name"]
        data = [c for c in CDS if c["Reviewed By"] == doctor]
    return jsonify(data)


@app.route("/api/care_coordination")
def api_care_coordination():
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401
    if session["role"] == "patient":
        pid = session["patient_id"]
        data = [c for c in CARE_COORD if c["Patient ID"] == pid]
    else:
        doctor = session["doctor_name"]
        data = [c for c in CARE_COORD if c["Referring Doctor"] == doctor or c["Receiving Doctor"] == doctor]
    return jsonify(data)


@app.route("/api/reporting")
def api_reporting():
    if not require_login() or session["role"] != "doctor":
        return jsonify({"error": "unauthorized"}), 401
    return jsonify(REPORTING)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
