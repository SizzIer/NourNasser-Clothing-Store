import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import customFetch from "../axios/custom";
import toast from "react-hot-toast";

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCaptured, setPaymentCaptured] = useState(false);

  useEffect(() => {
    const capturePayPalPayment = async () => {
      // v2 PayPal returns "token" as the PayPal order ID; v1 used "paymentId"
      const paymentId = searchParams.get("token") || searchParams.get("paymentId");
      const orderId = searchParams.get("orderId");

      if (paymentId && orderId && !isProcessing && !paymentCaptured) {
        setIsProcessing(true);
        try {
          const response = await customFetch.post("/paypal/capture-payment", {
            orderId: Number(orderId),
            paymentId,
          });

          if (response.data.success) {
            toast.success("Payment captured successfully!");
            setPaymentCaptured(true);
          } else {
            toast.error("Failed to capture payment");
          }
        } catch (error) {
          console.error("Payment capture error:", error);
          toast.error("Payment processing failed");
        } finally {
          setIsProcessing(false);
        }
      }
    };

    capturePayPalPayment();
  }, [searchParams, isProcessing, paymentCaptured]);

  return (
    <div className="max-w-screen-2xl mx-auto pt-20">
      <h1 className="text-5xl font-light text-center">Order Confirmation</h1>
      <p className="text-center mt-5 text-lg">
        Your order has been confirmed and will be shipped shortly.
      </p>
      {isProcessing && (
        <p className="text-center mt-5 text-base text-blue-600">
          Processing your PayPal payment...
        </p>
      )}
      <Link
        to="/shop"
        className="text-white bg-secondaryBrown text-center text-xl font-normal tracking-[0.6px] leading-[72px] w-[400px] mx-auto mt-5 h-12 flex items-center justify-center max-md:text-base"
      >
        Continue shopping
      </Link>
      <Link
        to="/order-history"
        className="text-white bg-secondaryBrown text-center text-xl font-normal tracking-[0.6px] leading-[72px] w-[400px] mx-auto mt-5 h-12 flex items-center justify-center max-md:text-base"
      >
        See order history and status
      </Link>
    </div>
  );
};
export default OrderConfirmation;
