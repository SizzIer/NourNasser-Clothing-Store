import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLoaderData, useNavigate } from "react-router-dom";
import { formatDate } from "../utils/formatDate";
import { calculateOrderTotal, calculateTax, FLAT_SHIPPING } from "../utils/orderTotals";

const SingleOrderHistory = () => {
  const [user] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
  const navigate = useNavigate();
  const singleOrder = useLoaderData() as Order;

  useEffect(() => {
    if (!user?.id) {
      toast.error("Please login to view this page");
      navigate("/login");
    }
  }, [user, navigate]);

  return (
    <div className="max-w-screen-2xl mx-auto pt-20 px-5">
      <h1 className="text-3xl font-bold mb-8">Order Details</h1>
      <div className="bg-white border border-gray-200 p-5 overflow-x-auto">
        <h2 className="text-2xl font-semibold mb-4">
          Order ID: {singleOrder.id}
        </h2>
        <p className="mb-2">Date: {formatDate(singleOrder.createdAt)}</p>
        <p className="mb-2">Subtotal: ${singleOrder.total.toFixed(2)}</p>
        <p className="mb-2">Shipping: ${FLAT_SHIPPING.toFixed(2)}</p>
        <p className="mb-2">Tax: ${calculateTax(singleOrder.total).toFixed(2)}</p>
        <p className="mb-2">
          Total: $
          {calculateOrderTotal(singleOrder.total).toFixed(2)}
        </p>
        <p className="mb-2">Status: {singleOrder.status}</p>
        {(singleOrder.email || singleOrder.address) && (
          <div className="mb-6 mt-4 border-t border-gray-200 pt-4">
            <h3 className="text-xl font-semibold mb-3">Shipping & contact</h3>
            {singleOrder.firstName || singleOrder.lastName ? (
              <p className="mb-1">
                {[singleOrder.firstName, singleOrder.lastName].filter(Boolean).join(" ")}
              </p>
            ) : null}
            {singleOrder.email ? <p className="mb-1">{singleOrder.email}</p> : null}
            {singleOrder.phone ? <p className="mb-1">{singleOrder.phone}</p> : null}
            {singleOrder.address ? (
              <p className="mb-1">
                {singleOrder.address}
                {singleOrder.apartment ? `, ${singleOrder.apartment}` : ""}
              </p>
            ) : null}
            {(singleOrder.city || singleOrder.region || singleOrder.postalCode) && (
              <p className="mb-1">
                {[singleOrder.city, singleOrder.region, singleOrder.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {singleOrder.country ? <p>{singleOrder.country}</p> : null}
          </div>
        )}
        <h3 className="text-xl font-semibold mt-6 mb-4">Items</h3>
        <table className="singleOrder-table min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="py-3 px-4 border-b"></th>
              <th className="py-3 px-4 border-b text-left">Product Name</th>
              <th className="py-3 px-4 border-b">Quantity</th>
              <th className="py-3 px-4 border-b">Price</th>
            </tr>
          </thead>
          <tbody>
            {singleOrder.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 px-4 border-b w-20">
                  <img
                    src={`/assets/${item.product?.imageUrl?.replace("/images/", "")}`}
                    alt={item.product?.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                </td>
                <td className="py-3 px-4 border-b">
                  <p className="font-medium">{item.product?.name}</p>
                  {item.color && <p className="text-sm text-gray-500">{item.color}</p>}
                  {item.size && <p className="text-sm text-gray-500">Size: {item.size.toUpperCase()}</p>}
                </td>
                <td className="py-3 px-4 border-b text-center">
                  {item.quantity}
                </td>
                <td className="py-3 px-4 border-b text-right">
                  ${item.unitPrice.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SingleOrderHistory;
