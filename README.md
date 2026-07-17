# MedFlow EHR — Flask App

A patient/doctor EHR dashboard built from your `EHR_Backend_Database.xlsx` workbook.

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

## Login

The welcome screen asks you to pick a role first, then shows a dropdown of
real Patient IDs (or Doctor names) pulled straight from your spreadsheet.
Passwords are masked, with a show/hide toggle.

- **Patient password:** `patient123`
- **Doctor password:** `doctor123`

(Change `PATIENT_PASSWORD` / `DOCTOR_PASSWORD` in `app.py`, or wire up
per-row passwords from your sheet, before using this for real data.)

## The 4 modules

1. **Storing & Managing Patient Health Data** — demographics, diagnosis, labs.
2. **Electronic Prescriptions** — drug, dosage, refills, status.
3. **Scheduling & Managing Appointments (Booking List)** — patients click an
   appointment and choose how it was booked: Phone / Online / Walk-In. If the
   appointment status is "Rescheduled," a reason field appears. Doctors see
   the same list **read-only** — the chosen mode shows as a fixed pill, not a
   button.
4. **Tracking Progress & Medical History** — every record shows a progress
   ring with a percentage (Poor → 25%, Fair → 50%, Stable → 65%, Good → 85%).
   Click **View Progress** for the full detail modal (diagnosis, medications,
   clinical notes).

## Data

`data/ehr_data.json` is a direct conversion of all 10 sheets from your
workbook (EHR_Summary sheet was a title page, so it's skipped). To refresh it
after editing the Excel file, re-run the extraction script you'd use
`openpyxl` for, or ask for it to be regenerated.

## Project structure

```
app.py                  Flask backend + all API routes
templates/welcome.html  Login screen
templates/dashboard.html Dashboard shell + 4 module panels
static/css/style.css    All styling
static/js/welcome.js    Login flow logic
static/js/dashboard.js  Module rendering, booking modal, progress rings
data/ehr_data.json      Your spreadsheet data, converted
```
