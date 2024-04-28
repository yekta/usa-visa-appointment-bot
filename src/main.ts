import cron from "node-cron";
import { checkAppointmentDate } from "@/appointment.ts";

checkAppointmentDate();
cron.schedule("*/10 * * * *", checkAppointmentDate);
