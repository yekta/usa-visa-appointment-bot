# USA Visa Appointment Bot

This is a simple Node application that uses Puppeteer to automate the process of rescheduling appointments on the US visa appointment website. It will notify you on Discord when it successfully reschedules an appointment or when it encounters an error.

## Environment Variables

```ini
EMAIL=test@gmail.com
PASSWORD=password123
SCHEDULE_ID=55555555
FACILITY_ID=124
COUNTRY_CODE=en-tr

DISCORD_SUCCESSFUL_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_UNSUCCESSFUL_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_USER_ID=333333333333333333

CURRENT_APPOINTMENT_DATE=10 August, 2024, 08:00
MAX_APPOINTMENT_DATE=20 July, 2024, 00:00
MIN_APPOINTMENT_DATE_THRESHOLD_IN_DAYS=5
TIME_ZONE=Europe/Istanbul
TIME_LOCALE=en-GB

DELAY_RANGE_MS=15000,16000
DELAY_RANGE_AFTER_ERROR_MS=60000,61000
```