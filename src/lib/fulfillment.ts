export const FULFILLMENT_METHODS = [
  "during-school",
  "after-school",
  "house-dropoff",
] as const;

export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

export const HOUSE_DROPOFF_FEE = 2;

export const AFTER_SCHOOL_TIME_SLOTS = [
  { value: "3:00-3:15", label: "3:00–3:15 PM" },
  { value: "3:15-3:30", label: "3:15–3:30 PM" },
  { value: "3:30-4:00", label: "3:30–4:00 PM" },
  { value: "4:00-4:30", label: "4:00–4:30 PM" },
] as const;

export type OrderFulfillment = {
  method: FulfillmentMethod;
  timeSlot?: string;
  requestedTime?: string;
  locationDetails?: string;
};

export function isFulfillmentMethod(value: unknown): value is FulfillmentMethod {
  return typeof value === "string" && FULFILLMENT_METHODS.includes(value as FulfillmentMethod);
}

export function getFulfillmentLabel(method?: FulfillmentMethod) {
  switch (method) {
    case "during-school":
      return "During-school pickup";
    case "after-school":
      return "After-school meetup";
    case "house-dropoff":
      return "Home drop-off";
    default:
      return "Not specified";
  }
}

export function getFulfillmentDescription(method: FulfillmentMethod) {
  switch (method) {
    case "during-school":
      return "Free";
    case "after-school":
      return "Free · choose a time slot";
    case "house-dropoff":
      return `+$${HOUSE_DROPOFF_FEE.toFixed(2)} · choose a time slot`;
  }
}

export function getFulfillmentFee(method?: FulfillmentMethod) {
  return method === "house-dropoff" ? HOUSE_DROPOFF_FEE : 0;
}

export function needsTimeSlot(method?: FulfillmentMethod) {
  return method === "after-school" || method === "house-dropoff";
}

export function needsLocationDetails(method?: FulfillmentMethod) {
  return method === "house-dropoff";
}

export function getTimeSlotOptions(method?: FulfillmentMethod) {
  return needsTimeSlot(method) ? AFTER_SCHOOL_TIME_SLOTS : [];
}

export function isValidTimeSlot(method: FulfillmentMethod, value: string) {
  if (!needsTimeSlot(method)) {
    return value.length === 0;
  }

  return getTimeSlotOptions(method).some((option) => option.value === value);
}

export function getTimeSlotLabel(value?: string) {
  if (!value) {
    return "";
  }

  return AFTER_SCHOOL_TIME_SLOTS.find((option) => option.value === value)?.label ?? value;
}

export function getLocationDetailsLabel(method?: FulfillmentMethod) {
  switch (method) {
    case "house-dropoff":
      return "Address / drop-off details";
    default:
      return "Location details";
  }
}

export function getLocationDetailsPlaceholder(method?: FulfillmentMethod) {
  switch (method) {
    case "house-dropoff":
      return "Address, apartment, gate code, or drop-off instructions";
    default:
      return "Location details";
  }
}

export function getFulfillmentSummary(fulfillment?: OrderFulfillment | null) {
  if (!fulfillment?.method) {
    return "Pickup details not specified";
  }

  const parts = [getFulfillmentLabel(fulfillment.method)];
  const timeLabel = getTimeSlotLabel(fulfillment.timeSlot ?? fulfillment.requestedTime);

  if (timeLabel) {
    parts.push(timeLabel);
  }

  if (fulfillment.locationDetails) {
    parts.push(fulfillment.locationDetails);
  }

  const fee = getFulfillmentFee(fulfillment.method);
  if (fee > 0) {
    parts.push(`+$${fee.toFixed(2)}`);
  }

  return parts.join(" • ");
}
