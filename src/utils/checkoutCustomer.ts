export const CHECKOUT_REQUIRED_MESSAGE = "Please fill in all required fields.";
export const CHECKOUT_EMPTY_CART_MESSAGE = "Your cart is empty. Add items before checking out.";

const FIELD_LABELS: Record<CheckoutFieldName, string> = {
  emailAddress: "email address",
  firstName: "first name",
  lastName: "last name",
  phone: "phone number",
  address: "street address",
  city: "city",
  country: "country",
  region: "region",
  postalCode: "postal code",
  cardNumber: "card number",
  nameOnCard: "name on card",
  expirationDate: "expiration date (MM/YY)",
  cvc: "CVC",
};

function formatFieldList(fields: CheckoutFieldName[]): string {
  const labels = fields.map((field) => FIELD_LABELS[field]);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function buildCheckoutValidationMessage(
  missingFields: CheckoutFieldName[],
  formatFields: CheckoutFieldName[]
): string {
  const hasMissing = missingFields.length > 0;
  const hasFormat = formatFields.length > 0;

  if (hasMissing && hasFormat) {
    return `Please fill in: ${formatFieldList(missingFields)} and enter valid values for ${formatFieldList(formatFields)}.`;
  }
  if (hasMissing) {
    return `Please fill in: ${formatFieldList(missingFields)}.`;
  }
  if (hasFormat) {
    return `Please enter valid values for ${formatFieldList(formatFields)}.`;
  }
  return "";
}

type CheckoutFields = Record<string, FormDataEntryValue | string | undefined>;

export type CheckoutFieldName =
  | "emailAddress"
  | "firstName"
  | "lastName"
  | "phone"
  | "address"
  | "city"
  | "country"
  | "region"
  | "postalCode"
  | "cardNumber"
  | "nameOnCard"
  | "expirationDate"
  | "cvc";

export type CheckoutFieldValidation = {
  invalidFields: CheckoutFieldName[];
  missingFields: CheckoutFieldName[];
  formatFields: CheckoutFieldName[];
  message: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function phoneDigitCount(phone: string): number {
  return phone.replace(/\D/g, "").length;
}

function isValidPhone(phone: string): boolean {
  const digits = phoneDigitCount(phone);
  return digits >= 10 && digits <= 15;
}

function isValidPostalCode(code: string): boolean {
  const trimmed = code.trim();
  return (
    trimmed.length >= 3 &&
    trimmed.length <= 12 &&
    /^[A-Za-z0-9][A-Za-z0-9\s-]*$/.test(trimmed)
  );
}

function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

function isValidAddressLine(line: string): boolean {
  return line.trim().length >= 3;
}

function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 13 && digits.length <= 19;
}

function isValidExpirationDate(value: string): boolean {
  return /^(0[1-9]|1[0-2])\/\d{2}$/.test(value.trim());
}

function isValidCvc(value: string): boolean {
  return /^\d{3,4}$/.test(value.trim());
}

function checkRequiredOrFormat(
  invalid: CheckoutFieldName[],
  missingFields: CheckoutFieldName[],
  formatFields: CheckoutFieldName[],
  field: CheckoutFieldName,
  value: string,
  isFormatValid: (value: string) => boolean
) {
  if (!value.trim()) {
    invalid.push(field);
    missingFields.push(field);
    return;
  }
  if (!isFormatValid(value)) {
    invalid.push(field);
    formatFields.push(field);
  }
}

export type CheckoutCustomerPayload = {
  emailAddress: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  address: string;
  apartment: string;
  city: string;
  country: string;
  region: string;
  postalCode: string;
  paymentType: string;
};

export function buildCustomerPayload(
  form: CheckoutFields,
  storedUser?: Partial<User> | null
): CheckoutCustomerPayload {
  return {
    emailAddress: storedUser?.email || String(form.emailAddress || ""),
    firstName: storedUser?.name || String(form.firstName || ""),
    lastName: storedUser?.lastname || String(form.lastName || ""),
    phone: storedUser?.phone || String(form.phone || ""),
    company: String(form.company || ""),
    address: String(form.address || ""),
    apartment: String(form.apartment || ""),
    city: String(form.city || ""),
    country: String(form.country || ""),
    region: String(form.region || ""),
    postalCode: String(form.postalCode || ""),
    paymentType: String(form.paymentType || ""),
  };
}

export function readCheckoutFormData(): Record<string, string> {
  const form = document.getElementById("checkout-form") as HTMLFormElement | null;
  if (!form) return {};

  const data: Record<string, string> = {};
  for (const element of form.elements) {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!input.name || input.disabled) continue;

    if (input instanceof HTMLInputElement && input.type === "radio") {
      if (input.checked) data[input.name] = input.value;
      continue;
    }

    data[input.name] = input.value;
  }

  return data;
}

export function validateContactFields(
  form: CheckoutFields,
  storedUser?: Partial<User> | null
): CheckoutFieldValidation {
  const customer = buildCustomerPayload(form, storedUser);
  const invalid: CheckoutFieldName[] = [];
  const missingFields: CheckoutFieldName[] = [];
  const formatFields: CheckoutFieldName[] = [];

  checkRequiredOrFormat(
    invalid,
    missingFields,
    formatFields,
    "emailAddress",
    customer.emailAddress,
    isValidEmail
  );
  checkRequiredOrFormat(invalid, missingFields, formatFields, "firstName", customer.firstName, isValidName);
  checkRequiredOrFormat(invalid, missingFields, formatFields, "lastName", customer.lastName, isValidName);
  checkRequiredOrFormat(invalid, missingFields, formatFields, "phone", customer.phone, isValidPhone);
  checkRequiredOrFormat(invalid, missingFields, formatFields, "address", customer.address, isValidAddressLine);
  checkRequiredOrFormat(invalid, missingFields, formatFields, "city", customer.city, isValidName);
  checkRequiredOrFormat(invalid, missingFields, formatFields, "region", customer.region, isValidName);
  checkRequiredOrFormat(
    invalid,
    missingFields,
    formatFields,
    "postalCode",
    customer.postalCode,
    isValidPostalCode
  );

  if (!customer.country.trim()) {
    invalid.push("country");
    missingFields.push("country");
  }

  return {
    invalidFields: invalid,
    missingFields,
    formatFields,
    message: buildCheckoutValidationMessage(missingFields, formatFields),
  };
}

/** @deprecated Use validateContactFields */
export function getInvalidContactFields(
  form: CheckoutFields,
  storedUser?: Partial<User> | null
): CheckoutFieldName[] {
  return validateContactFields(form, storedUser).invalidFields;
}

export function scrollToFirstInvalidField(fields: CheckoutFieldName[]) {
  if (fields.length === 0) return;
  const el = document.querySelector(
    `#checkout-form [name="${fields[0]}"]`
  ) as HTMLElement | null;
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  (el as HTMLInputElement | undefined)?.focus?.();
}

export function validateCardFields(
  data: Record<string, FormDataEntryValue | string | undefined>
): CheckoutFieldValidation {
  const invalid: CheckoutFieldName[] = [];
  const missingFields: CheckoutFieldName[] = [];
  const formatFields: CheckoutFieldName[] = [];

  checkRequiredOrFormat(
    invalid,
    missingFields,
    formatFields,
    "cardNumber",
    String(data.cardNumber ?? ""),
    isValidCardNumber
  );
  checkRequiredOrFormat(
    invalid,
    missingFields,
    formatFields,
    "nameOnCard",
    String(data.nameOnCard ?? ""),
    isValidName
  );
  checkRequiredOrFormat(
    invalid,
    missingFields,
    formatFields,
    "expirationDate",
    String(data.expirationDate ?? ""),
    isValidExpirationDate
  );
  checkRequiredOrFormat(
    invalid,
    missingFields,
    formatFields,
    "cvc",
    String(data.cvc ?? ""),
    isValidCvc
  );

  return {
    invalidFields: invalid,
    missingFields,
    formatFields,
    message: buildCheckoutValidationMessage(missingFields, formatFields),
  };
}

/** @deprecated Use validateCardFields */
export function getInvalidCardFields(
  data: Record<string, FormDataEntryValue | string | undefined>
): CheckoutFieldName[] {
  return validateCardFields(data).invalidFields;
}

const CHECKOUT_FIELD_BASE =
  "block w-full py-2 indent-2 outline-none border shadow-sm sm:text-sm";

export function checkoutFieldClass(fieldName: string, invalidFields: Set<string>): string {
  return invalidFields.has(fieldName)
    ? `${CHECKOUT_FIELD_BASE} border-red-500 ring-1 ring-red-500 focus:border-red-500`
    : `${CHECKOUT_FIELD_BASE} border-gray-300 focus:border-gray-400`;
}

export function checkoutLabelClass(fieldName: string, invalidFields: Set<string>): string {
  return invalidFields.has(fieldName)
    ? "block text-sm font-medium text-red-600"
    : "block text-sm font-medium text-gray-700";
}
