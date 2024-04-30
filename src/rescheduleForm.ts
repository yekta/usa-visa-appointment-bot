import { Page } from "puppeteer";

export async function getRescheduleFormData(page: Page) {
  const authenticityToken = await page.$eval(
    '[name="authenticity_token"]',
    (element) => element.getAttribute("value")
  );
  const useConsulateAppointmentCapacity = await page.$eval(
    '[name="use_consulate_appointment_capacity"]',
    (element) => element.getAttribute("value")
  );
  return {
    authenticityToken,
    useConsulateAppointmentCapacity,
  };
}
