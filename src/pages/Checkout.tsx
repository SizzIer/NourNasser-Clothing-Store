import { HiTrash as TrashIcon } from "react-icons/hi2";
import { Button } from "../components";
import { useAppDispatch, useAppSelector } from "../hooks";
import { removeProductFromTheCart, clearCart } from "../features/cart/cartSlice";
import customFetch from "../axios/custom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { checkCheckoutFormData } from "../utils/checkCheckoutFormData";
import { useState, useRef } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const paymentMethods = [
  { id: "credit-card", title: "Credit card" },
  { id: "etransfer", title: "eTransfer" },
];

const Checkout = () => {
  const { productsInCart, subtotal } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedPayment, setSelectedPayment] = useState("credit-card");
  const [isLoading, setIsLoading] = useState(false);
  const dbOrderIdRef = useRef<number | null>(null);

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

    if (!checkCheckoutFormData(checkoutData)) {
      setIsLoading(false);
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
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
            <form id="checkout-form" onSubmit={handleCheckoutSubmit}>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Contact information
                </h2>

              <div className="mt-4">
                <label
                  htmlFor="email-address"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="email-address"
                    name="emailAddress"
                    autoComplete="email"
                    className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
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
                  <label
                    htmlFor="first-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    First name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="first-name"
                      name="firstName"
                      autoComplete="given-name"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                      required={true}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="last-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Last name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="last-name"
                      name="lastName"
                      autoComplete="family-name"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                      required={true}
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
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Address
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="address"
                      id="address"
                      autoComplete="street-address"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                      required={true}
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
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-gray-700"
                  >
                    City
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="city"
                      id="city"
                      autoComplete="address-level2"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                      required={true}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="country"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Country
                  </label>
                  <div className="mt-1">
                    <select
                      id="country"
                      name="country"
                      autoComplete="country-name"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                      required={true}
                    >
                      <option>United States</option>
                      <option>Canada</option>
                      <option>Mexico</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="region"
                    className="block text-sm font-medium text-gray-700"
                  >
                    State / Province
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="region"
                      id="region"
                      autoComplete="address-level1"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                      required={true}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="postal-code"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Postal code
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="postalCode"
                      id="postal-code"
                      autoComplete="postal-code"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                      required={true}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Phone
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      autoComplete="tel"
                      className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                      required={true}
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
                    <label
                      htmlFor="card-number"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Card number
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="card-number"
                        name="cardNumber"
                        autoComplete="cc-number"
                        className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                        required={true}
                      />
                    </div>
                  </div>

                  <div className="col-span-4">
                    <label
                      htmlFor="name-on-card"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Name on card
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="name-on-card"
                        name="nameOnCard"
                        autoComplete="cc-name"
                        className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                        required={true}
                      />
                    </div>
                  </div>

                  <div className="col-span-3">
                    <label
                      htmlFor="expiration-date"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Expiration date (MM/YY)
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="expirationDate"
                        id="expiration-date"
                        autoComplete="cc-exp"
                        className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                        required={true}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cvc"
                      className="block text-sm font-medium text-gray-700"
                    >
                      CVC
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="cvc"
                        id="cvc"
                        autoComplete="csc"
                        className="block w-full py-2 indent-2 border-gray-300 outline-none focus:border-gray-400 border border shadow-sm sm:text-sm"
                        required={true}
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
            <div className="mt-4 border border-blue-300 bg-blue-50 p-6 rounded-lg">
              <h3 className="text-base font-medium text-gray-900 mb-3">Pay with PayPal</h3>
              {productsInCart.length > 0 ? (
                <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID }}>
                  <PayPalButtons
                    style={{ layout: "vertical", label: "pay" }}
                    createOrder={async () => {
                      const user = JSON.parse(localStorage.getItem("user") || "{}");
                      const dbRes = await customFetch.post("/orders", {
                        data: {
                          emailAddress: user.email || "",
                          firstName: user.name?.split(" ")[0] || "Guest",
                          lastName: user.name?.split(" ").slice(1).join(" ") || "User",
                          address: "", apartment: "", city: "",
                          country: "United States", region: "", postalCode: "",
                          phone: user.phone || "", company: "",
                          paymentType: "paypal",
                        },
                        products: productsInCart,
                        subtotal,
                        user: user.email ? { email: user.email, id: user.id } : null,
                        orderStatus: "Processing",
                        orderDate: new Date().toISOString(),
                      });
                      dbOrderIdRef.current = dbRes.data.orderId;
                      const ppRes = await customFetch.post("/paypal/create-payment", {
                        orderId: dbRes.data.orderId,
                        subtotal,
                      });
                      return ppRes.data.paymentId;
                    }}
                    onApprove={async (data) => {
                      await customFetch.post("/paypal/capture-payment", {
                        orderId: dbOrderIdRef.current,
                        paymentId: data.orderID,
                      });
                      dispatch(clearCart());
                      navigate("/order-confirmation", { state: { orderId: dbOrderIdRef.current } });
                    }}
                    onError={() => {
                      toast.error("PayPal payment failed. Please try again.");
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
                    ${subtotal ? 5 : 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm">Taxes</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    ${subtotal ? subtotal / 5 : 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                  <dt className="text-base font-medium">Total</dt>
                  <dd className="text-base font-medium text-gray-900">
                    ${subtotal ? subtotal + 5 + subtotal / 5 : 0}
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
