import { HiTrash as TrashIcon } from "react-icons/hi2";
import { useAppDispatch, useAppSelector } from "../hooks";
import { removeProductFromTheCart, clearCart } from "../features/cart/cartSlice";
import customFetch from "../axios/custom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { checkCheckoutFormData, validatePayPalCheckout } from "../utils/checkCheckoutFormData";
import {
  CHECKOUT_REQUIRED_MESSAGE,
  checkoutFieldClass,
  checkoutLabelClass,
  readCheckoutFormData,
  scrollToFirstInvalidField,
  type CheckoutFieldName,
} from "../utils/checkoutCustomer";
import { calculateOrderTotal, calculateTax, FLAT_SHIPPING } from "../utils/orderTotals";
import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import axios from "axios";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

const paymentMethods = [
  { id: "credit-card", title: "Credit card" },
  { id: "etransfer", title: "eTransfer" },
];

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
const isPayPalClientIdMissing = !paypalClientId?.trim();
const isPayPalClientIdPlaceholder =
  !!paypalClientId &&
  (paypalClientId.includes("your-paypal") || paypalClientId.includes("replace-with"));

type PayPalOrderButtonsProps = {
  productsInCart: ProductInCart[];
  subtotal: number;
  dbOrderIdRef: React.MutableRefObject<number | null>;
  onSuccess: (orderId: number) => void;
  onValidationFailed: (fields: CheckoutFieldName[], message?: string) => void;
  skipPayPalErrorToastRef: React.MutableRefObject<boolean>;
};

function CheckoutLabel({
  htmlFor,
  fieldName,
  invalidFields,
  children,
  required = true,
}: {
  htmlFor: string;
  fieldName: string;
  invalidFields: Set<string>;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={checkoutLabelClass(fieldName, invalidFields)}>
      {children}
      {required ? (
        <span className="text-red-600" aria-hidden="true">
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
}

function PayPalOrderButtons({
  productsInCart,
  subtotal,
  dbOrderIdRef,
  onSuccess,
  onValidationFailed,
  skipPayPalErrorToastRef,
}: PayPalOrderButtonsProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isPending) {
    return <p className="text-sm text-gray-600">Loading PayPal button...</p>;
  }

  if (isRejected) {
    return (
      <p className="text-sm text-red-600">
        PayPal failed to load. Check VITE_PAYPAL_CLIENT_ID in the project root .env (must match your
        sandbox app), restart the dev server, and ensure paypal.com is not blocked.
      </p>
    );
  }

  return (
    <PayPalButtons
      style={{ layout: "vertical", label: "pay" }}
      createOrder={async () => {
        try {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          const form = readCheckoutFormData();
          const validation = validatePayPalCheckout(form, storedUser, productsInCart, subtotal);
          if (!validation.valid || !validation.customer) {
            skipPayPalErrorToastRef.current = true;
            onValidationFailed(validation.invalidFields, validation.message);
            throw new Error("Checkout form is incomplete");
          }
          const customer = validation.customer;

          const dbRes = await customFetch.post("/orders", {
            data: {
              ...customer,
              paymentType: "paypal",
            },
            products: productsInCart,
            subtotal,
            user: storedUser.email ? { email: storedUser.email, id: storedUser.id } : null,
            orderStatus: "Processing",
            orderDate: new Date().toISOString(),
          });
          dbOrderIdRef.current = dbRes.data.orderId;
          const ppRes = await customFetch.post("/paypal/create-payment", {
            orderId: dbRes.data.orderId,
          });
          if (!ppRes.data.paymentId) {
            throw new Error("No PayPal payment id returned");
          }
          return ppRes.data.paymentId;
        } catch (error) {
          if (error instanceof Error && error.message === "Checkout form is incomplete") {
            throw error;
          }
          const message = axios.isAxiosError(error)
            ? (error.response?.data?.error as string) ||
              (error.response?.data?.details as string) ||
              "Could not start PayPal checkout"
            : "Could not start PayPal checkout";
          toast.error(message);
          throw error;
        }
      }}
      onApprove={async (data) => {
        try {
          await customFetch.post("/paypal/capture-payment", {
            orderId: dbOrderIdRef.current,
            paymentId: data.orderID,
          });
          onSuccess(dbOrderIdRef.current!);
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? (error.response?.data?.error as string) || "PayPal payment capture failed"
            : "PayPal payment capture failed";
          toast.error(message);
          throw error;
        }
      }}
      onError={() => {
        if (skipPayPalErrorToastRef.current) {
          skipPayPalErrorToastRef.current = false;
          return;
        }
        toast.error("PayPal payment failed. Please try again.");
      }}
    />
  );
}

const Checkout = () => {
  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedPayment, setSelectedPayment] = useState("credit-card");
  const [isLoading, setIsLoading] = useState(false);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [validationMessage, setValidationMessage] = useState("");
  const dbOrderIdRef = useRef<number | null>(null);
  const skipPayPalErrorToastRef = useRef(false);

  const showValidationErrors = (fields: CheckoutFieldName[], message?: string) => {
    const resolvedMessage = message || CHECKOUT_REQUIRED_MESSAGE;
    flushSync(() => {
      setInvalidFields(new Set(fields));
      setValidationMessage(resolvedMessage);
    });
    scrollToFirstInvalidField(fields);
  };

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const user = JSON.parse(raw) as Partial<User>;
    const form = document.getElementById("checkout-form") as HTMLFormElement | null;
    if (!form) return;

    const prefill = (name: string, value?: string | null) => {
      if (!value) return;
      const field = form.elements.namedItem(name) as HTMLInputElement | null;
      if (field && !field.value.trim()) field.value = value;
    };

    prefill("emailAddress", user.email);
    prefill("firstName", user.name);
    prefill("lastName", user.lastname);
    prefill("phone", user.phone ?? null);
  }, []);

  const clearFieldError = (fieldName: string) => {
    setInvalidFields((prev) => {
      if (!prev.has(fieldName)) return prev;
      const next = new Set(prev);
      next.delete(fieldName);
      return next;
    });
  };

  const handleCheckoutSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const checkoutData = {
      data,
      products: productsInCart,
      subtotal: subtotal,
    };

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const validation = checkCheckoutFormData(
      { data, products: productsInCart, subtotal },
      user
    );

    if (!validation.valid) {
      showValidationErrors(validation.invalidFields, validation.message);
      setIsLoading(false);
      return;
    }

    setInvalidFields(new Set());
    setValidationMessage("");

    try {
      const orderPayload = {
        ...checkoutData,
        user: user.email ? { email: user.email, id: user.id } : null,
        orderStatus: "Processing",
        orderDate: new Date().toISOString(),
      };

      const response = await customFetch.post("/orders", orderPayload);

      if (response.status === 201) {
        // Handle other payment methods
        dispatch(clearCart());
        toast.success("Order has been placed successfully");
        navigate("/order-confirmation", { state: { orderId: response.data.orderId } });
        setIsLoading(false);
      } else {
        toast.error("Something went wrong, please try again later");
        setIsLoading(false);
      }
    } catch (error: any) {
      const msg = error.response?.data?.details || error.response?.data?.error || "Failed to create order";
      toast.error(msg);
      console.error("Checkout error:", error.response?.data || error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl">
      <div className="pb-24 pt-16 px-5 max-[400px]:px-3">
        <h2 className="sr-only">Checkout</h2>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
          {/* Left side: Checkout form */}
          <div>
            <form
              id="checkout-form"
              onSubmit={handleCheckoutSubmit}
              onInput={(e) => {
                const name = (e.target as HTMLInputElement | HTMLSelectElement).name;
                if (name) clearFieldError(name);
              }}
            >
              {validationMessage ? (
                <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {validationMessage}
                </p>
              ) : null}
              <p className="mb-6 text-sm text-gray-500">
                Fields marked with <span className="text-red-600">*</span> are required.
              </p>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Contact information
                </h2>

              <div className="mt-4">
                <CheckoutLabel
                  htmlFor="email-address"
                  fieldName="emailAddress"
                  invalidFields={invalidFields}
                >
                  Email address
                </CheckoutLabel>
                <div className="mt-1">
                  <input
                    type="email"
                    id="email-address"
                    name="emailAddress"
                    autoComplete="email"
                    className={checkoutFieldClass("emailAddress", invalidFields)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-gray-200 pt-10">
              <h2 className="text-lg font-medium text-gray-900">
                Shipping information
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                <div>
                  <CheckoutLabel
                    htmlFor="first-name"
                    fieldName="firstName"
                    invalidFields={invalidFields}
                  >
                    First name
                  </CheckoutLabel>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="first-name"
                      name="firstName"
                      autoComplete="given-name"
                      className={checkoutFieldClass("firstName", invalidFields)}
                    />
                  </div>
                </div>

                <div>
                  <CheckoutLabel
                    htmlFor="last-name"
                    fieldName="lastName"
                    invalidFields={invalidFields}
                  >
                    Last name
                  </CheckoutLabel>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="last-name"
                      name="lastName"
                      autoComplete="family-name"
                      className={checkoutFieldClass("lastName", invalidFields)}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Company <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="company"
                      id="company"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <CheckoutLabel
                    htmlFor="address"
                    fieldName="address"
                    invalidFields={invalidFields}
                  >
                    Address
                  </CheckoutLabel>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="address"
                      id="address"
                      autoComplete="street-address"
                      className={checkoutFieldClass("address", invalidFields)}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="apartment"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Apartment, suite, etc. <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="apartment"
                      id="apartment"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <CheckoutLabel
                    htmlFor="city"
                    fieldName="city"
                    invalidFields={invalidFields}
                  >
                    City
                  </CheckoutLabel>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="city"
                      id="city"
                      autoComplete="address-level2"
                      className={checkoutFieldClass("city", invalidFields)}
                    />
                  </div>
                </div>

                <div>
                  <CheckoutLabel
                    htmlFor="country"
                    fieldName="country"
                    invalidFields={invalidFields}
                  >
                    Country
                  </CheckoutLabel>
                  <div className="mt-1">
                    <select
                      id="country"
                      name="country"
                      autoComplete="country-name"
                      className={checkoutFieldClass("country", invalidFields)}
                    >
                      <option>United States</option>
                      <option>Canada</option>
                      <option>Mexico</option>
                    </select>
                  </div>
                </div>

                <div>
                  <CheckoutLabel
                    htmlFor="region"
                    fieldName="region"
                    invalidFields={invalidFields}
                  >
                    State / Province
                  </CheckoutLabel>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="region"
                      id="region"
                      autoComplete="address-level1"
                      className={checkoutFieldClass("region", invalidFields)}
                    />
                  </div>
                </div>

                <div>
                  <CheckoutLabel
                    htmlFor="postal-code"
                    fieldName="postalCode"
                    invalidFields={invalidFields}
                  >
                    Postal code
                  </CheckoutLabel>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="postalCode"
                      id="postal-code"
                      autoComplete="postal-code"
                      className={checkoutFieldClass("postalCode", invalidFields)}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <CheckoutLabel
                    htmlFor="phone"
                    fieldName="phone"
                    invalidFields={invalidFields}
                  >
                    Phone
                  </CheckoutLabel>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      autoComplete="tel"
                      className={checkoutFieldClass("phone", invalidFields)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="mt-10 border-t border-gray-200 pt-10">
              <h2 className="text-lg font-medium text-gray-900">Payment</h2>

              <fieldset className="mt-4">
                <legend className="sr-only">Payment type</legend>
                <div className="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                  {paymentMethods.map((paymentMethod) => (
                    <div key={paymentMethod.id} className="flex items-center">
                      <input
                        id={paymentMethod.id}
                        name="paymentType"
                        type="radio"
                        value={paymentMethod.id}
                        checked={selectedPayment === paymentMethod.id}
                        onChange={(e) => setSelectedPayment(e.target.value)}
                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />

                      <label
                        htmlFor={paymentMethod.id}
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        {paymentMethod.title}
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>

              {/* Credit Card Fields */}
              {selectedPayment === "credit-card" && (
                <div className="mt-6 grid grid-cols-4 gap-x-4 gap-y-6">
                  <div className="col-span-4">
                    <CheckoutLabel
                      htmlFor="card-number"
                      fieldName="cardNumber"
                      invalidFields={invalidFields}
                    >
                      Card number
                    </CheckoutLabel>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="card-number"
                        name="cardNumber"
                        autoComplete="cc-number"
                        className={checkoutFieldClass("cardNumber", invalidFields)}
                      />
                    </div>
                  </div>

                  <div className="col-span-4">
                    <CheckoutLabel
                      htmlFor="name-on-card"
                      fieldName="nameOnCard"
                      invalidFields={invalidFields}
                    >
                      Name on card
                    </CheckoutLabel>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="name-on-card"
                        name="nameOnCard"
                        autoComplete="cc-name"
                        className={checkoutFieldClass("nameOnCard", invalidFields)}
                      />
                    </div>
                  </div>

                  <div className="col-span-3">
                    <CheckoutLabel
                      htmlFor="expiration-date"
                      fieldName="expirationDate"
                      invalidFields={invalidFields}
                    >
                      Expiration date (MM/YY)
                    </CheckoutLabel>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="expirationDate"
                        id="expiration-date"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        className={checkoutFieldClass("expirationDate", invalidFields)}
                      />
                    </div>
                  </div>

                  <div>
                    <CheckoutLabel
                      htmlFor="cvc"
                      fieldName="cvc"
                      invalidFields={invalidFields}
                    >
                      CVC
                    </CheckoutLabel>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="cvc"
                        id="cvc"
                        autoComplete="csc"
                        className={checkoutFieldClass("cvc", invalidFields)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* eTransfer Info */}
              {selectedPayment === "etransfer" && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    You will receive eTransfer payment instructions via email after order confirmation.
                  </p>
                </div>
              )}
            </div>
            </form>
            </div>

          {/* Right side: Order summary */}
          <div className="mt-10 lg:mt-0">
            <h2 className="text-lg font-medium text-gray-900">Order summary</h2>

            {/* PayPal Button Section */}
            <div className="paypal-checkout-host mt-4 border border-blue-300 bg-blue-50 p-6 rounded-lg">
              <h3 className="text-base font-medium text-gray-900 mb-3">Pay with PayPal</h3>
              {isPayPalClientIdMissing ? (
                <p className="text-sm text-red-600">
                  PayPal is not configured: missing VITE_PAYPAL_CLIENT_ID. Copy .env.example to .env at the
                  project root and fill in your PayPal sandbox client ID, then restart the dev server.
                </p>
              ) : isPayPalClientIdPlaceholder ? (
                <p className="text-sm text-red-600">
                  PayPal is not configured: VITE_PAYPAL_CLIENT_ID in the project root .env is still a placeholder.
                  Use the same sandbox Client ID as PAYPAL_CLIENT_ID in server/.env, then restart the dev server.
                </p>
              ) : productsInCart.length > 0 ? (
                <PayPalScriptProvider
                  options={{
                    clientId: paypalClientId!,
                    currency: "USD",
                    intent: "capture",
                  }}
                >
                  <PayPalOrderButtons
                    productsInCart={productsInCart}
                    subtotal={subtotal}
                    dbOrderIdRef={dbOrderIdRef}
                    onValidationFailed={showValidationErrors}
                    skipPayPalErrorToastRef={skipPayPalErrorToastRef}
                    onSuccess={(orderId) => {
                      dispatch(clearCart());
                      navigate("/order-confirmation", { state: { orderId } });
                    }}
                  />
                </PayPalScriptProvider>
              ) : (
                <p className="text-sm text-gray-500">Add items to your cart to pay with PayPal.</p>
              )}
            </div>

            {/* Order Items */}
            <div className="mt-4 border border-gray-200 bg-white shadow-sm">
              <h3 className="sr-only">Items in your cart</h3>
              <ul role="list" className="divide-y divide-gray-200">
                {productsInCart.map((product) => (
                  <li key={product?.id} className="flex px-4 py-6 sm:px-6">
                    <div className="flex-shrink-0">
                      <img
                        src={`/assets/${product?.image}`}
                        alt={product?.title}
                        className="w-20 rounded-md"
                      />
                    </div>

                    <div className="ml-6 flex flex-1 flex-col">
                      <div className="flex">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-700 hover:text-gray-800">
                            {product?.title}
                          </h4>
                          {product?.color &&
                          product.color.trim() &&
                          product.color.toLowerCase() !== "default" ? (
                            <p className="mt-1 text-sm text-gray-500">
                              {product.color}
                            </p>
                          ) : null}
                          {product?.size ? (
                            <p className="mt-1 text-sm text-gray-500">
                              Size{" "}
                              <span className="font-medium text-gray-700">
                                {product.size.toUpperCase()}
                              </span>
                            </p>
                          ) : null}
                        </div>

                        <div className="ml-4 flow-root flex-shrink-0">
                          <button
                            type="button"
                            className="-m-2.5 flex items-center justify-center bg-white p-2.5 text-gray-400 hover:text-gray-500"
                            onClick={() =>
                              dispatch(
                                removeProductFromTheCart({ id: product?.id })
                              )
                            }
                          >
                            <span className="sr-only">Remove</span>
                            <TrashIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-1 items-end justify-between pt-2">
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          ${product?.price}
                        </p>

                        <div className="ml-4">
                          <p className="text-base">
                            Quantity: {product?.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="space-y-6 border-t border-gray-200 px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <dt className="text-sm">Subtotal</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    ${subtotal}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm">Shipping</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    ${subtotal ? FLAT_SHIPPING.toFixed(2) : 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm">Taxes</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    ${subtotal ? calculateTax(subtotal).toFixed(2) : 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                  <dt className="text-base font-medium">Total</dt>
                  <dd className="text-base font-medium text-gray-900">
                    ${subtotal ? calculateOrderTotal(subtotal).toFixed(2) : 0}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Confirm Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Checkout;
