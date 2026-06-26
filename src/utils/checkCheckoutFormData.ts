import {
  buildCustomerPayload,
  buildCheckoutValidationMessage,
  CHECKOUT_EMPTY_CART_MESSAGE,
  validateCardFields,
  validateContactFields,
  type CheckoutCustomerPayload,
  type CheckoutFieldName,
} from "./checkoutCustomer";

export type CheckoutValidationResult = {
  valid: boolean;
  invalidFields: CheckoutFieldName[];
  message: string;
  customer?: CheckoutCustomerPayload;
};

function mergeValidation(
  contact: ReturnType<typeof validateContactFields>,
  card?: ReturnType<typeof validateCardFields>
): Pick<CheckoutValidationResult, "invalidFields" | "message"> {
  const invalidFields = [...contact.invalidFields, ...(card?.invalidFields ?? [])];
  const missingFields = [...contact.missingFields, ...(card?.missingFields ?? [])];
  const formatFields = [...contact.formatFields, ...(card?.formatFields ?? [])];

  return {
    invalidFields,
    message: buildCheckoutValidationMessage(missingFields, formatFields),
  };
}

export const checkCheckoutFormData = (
  checkoutData: {
    data: {
      [k: string]: FormDataEntryValue;
    };
    products: ProductInCart[];
    subtotal: number;
  },
  storedUser?: Partial<User> | null
): CheckoutValidationResult => {
  const customer = buildCustomerPayload(checkoutData.data, storedUser);

  if (checkoutData?.products.length === 0 || checkoutData?.subtotal === 0) {
    return { valid: false, invalidFields: [], message: CHECKOUT_EMPTY_CART_MESSAGE, customer };
  }

  const contact = validateContactFields(checkoutData.data, storedUser);
  const card =
    checkoutData.data?.paymentType === "credit-card"
      ? validateCardFields(checkoutData.data)
      : undefined;
  const { invalidFields, message } = mergeValidation(contact, card);

  return {
    valid: invalidFields.length === 0,
    invalidFields,
    message,
    customer,
  };
};

export function validatePayPalCheckout(
  form: Record<string, FormDataEntryValue>,
  storedUser?: Partial<User> | null,
  productsInCart: ProductInCart[] = [],
  subtotal = 0
): CheckoutValidationResult {
  const customer = buildCustomerPayload({ ...form, paymentType: "paypal" }, storedUser);

  if (productsInCart.length === 0 || subtotal === 0) {
    return { valid: false, invalidFields: [], message: CHECKOUT_EMPTY_CART_MESSAGE, customer };
  }

  const { invalidFields, message } = validateContactFields(form, storedUser);

  return {
    valid: invalidFields.length === 0,
    invalidFields,
    message,
    customer,
  };
}
