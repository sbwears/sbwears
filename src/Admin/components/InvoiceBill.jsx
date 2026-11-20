// import React from "react";
// import ProductTable from "./ProductTable";

// const InvoiceBill = () => {
//   const orderDetails = {
//     orderId: "6749adc5f5952dfa790d184f",
//     dateTime: "29/11/2024 17:34:21",
//     paymentMethod: "Online Payment",
//     status: "Pending",
//     items: [
//       { customerId: "CUST3190", product: "Kurtha", quantity: 1, price: 1746, unit: ""},
//       { customerId: "CUST7284", product: "Saree", quantity: 1, price: 390.2, unit: "" },
//       { customerId: "CUST6547", product: "Jeans", quantity: 1, price: 1088.2, unit: "" },
//     ],
//     customerDetails: {
//       name: "Manoranjan",
//       address: "Mathikere, Bangalore, 570001",
//       phone: "7846932498",
//       email: "mano@gmail.com",
//     },
//     priceBreakdown: {
//       totalMRP: 1930.0,
//       shippingFees: 0.0,
//       discount: 56.6,
//       totalPrice: 1873.4,
//     },
//   };

//   return (
//     <div className="max-w-4xl mx-auto pt-0 p-6 bg-white  rounded-lg">
//       {/* Order Details */}
//       <div className="mb-6">
//         <h2 className="text-lg font-bold text-gray-700">Order Details</h2>
//         <div className="grid grid-cols-2 gap-4 mt-2">
//           <p className="text-sm text-gray-600">
//             <span className="font-semibold">Order ID:</span> {orderDetails.orderId}
//           </p>
//           <p className="text-sm text-gray-600">
//             <span className="font-semibold">Date/Time:</span> {orderDetails.dateTime}
//           </p>
//           <p className="text-sm text-gray-600">
//             <span className="font-semibold">Payment Method:</span> {orderDetails.paymentMethod}
//           </p>
//           <p className="text-sm text-gray-600">
//             <span className="font-semibold">Status:</span>{" "}
//             <span className="text-yellow-600">{orderDetails.status}</span>
//           </p>
//           <p className="text-sm text-gray-600">
//             <span className="font-semibold">Customer ID:</span>{" "}
//             <span>CUST3190</span>
//           </p>
//         </div>
//       </div>

//       {/* Items Section */}
//       <div className="mb-6">
//         {/* <h2 className="text-lg font-bold text-gray-700">Items</h2>
//         <div className="mt-2">
//           {orderDetails.items.map((item, index) => (
//             <div
//               key={index}
//               className="flex justify-between border-b border-gray-200 py-2"
//             >
//               <p className="text-sm text-gray-600">
//                 {item.product} - {item.quantity} x ₹{item.price}  
//               </p>
//             </div>
//           ))}
//         </div> */}
//     <ProductTable/>
//       </div>
      
//       {/* Shipping Address */}
//       <div className="mb-6">
//         <h2 className="text-lg font-bold text-gray-700">Shipping Address</h2>
//         <div className="mt-2 text-sm text-gray-600">
//           <p>
//             <span className="font-semibold">Customer Name:</span>{" "}
//             {orderDetails.customerDetails.name}
//           </p>
//           <p>
//             <span className="font-semibold">Address:</span>{" "}
//             {orderDetails.customerDetails.address}
//           </p>
//           <p>
//             <span className="font-semibold">Phone:</span>{" "}
//             {orderDetails.customerDetails.phone}
//           </p>
//           <p>
//             <span className="font-semibold">Email:</span>{" "}
//             {orderDetails.customerDetails.email}
//           </p>
//         </div>
//       </div>

//       {/* Price Breakdown */}
//       <div>
//         <h2 className="text-lg font-bold text-gray-700">Price Breakdown</h2>
//         <div className="mt-2 text-sm text-gray-600">
//           <p className="flex justify-between">
//             <span>Total MRP:</span> <span>₹{orderDetails.priceBreakdown.totalMRP.toFixed(2)}</span>
//           </p>
//           <p className="flex justify-between">
//             <span>Shipping Fees:</span>{" "}
//             <span>₹{orderDetails.priceBreakdown.shippingFees.toFixed(2)}</span>
//           </p>
//           <p className="flex justify-between">
//             <span>Discount:</span> <span>- ₹{orderDetails.priceBreakdown.discount.toFixed(2)}</span>
//           </p>
//           <hr className="my-2" />
//           <p className="flex justify-between font-bold text-gray-700">
//             <span>Total Price:</span>{" "}
//             <span>₹{orderDetails.priceBreakdown.totalPrice.toFixed(2)}</span>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default InvoiceBill;
import React from "react";

const InvoiceBill = ({ order }) => {
  console.log("order : " , order)
  if (!order) return <div>Loading order details...</div>;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
  };

  return (
    <div className="max-w-4xl mx-auto pt-0 p-6 bg-white rounded-lg">
      {/* Order Details */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-700">Order Details</h2>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Order ID:</span> {order._id}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Date/Time:</span> {formatDate(order.createdAt)}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Payment Method:</span> {order.paymentMethod}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Status:</span>{" "}
            <span className="text-yellow-600 capitalize">{order.status}</span>
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Payment Status:</span>{" "}
            <span className="capitalize">{order.paymentStatus}</span>
          </p>
        </div>
      </div>

      {/* Items Section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-700">Items</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{item.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{item.price * item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Shipping Address */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-700">Shipping Address</h2>
        <div className="mt-2 text-sm text-gray-600">
          <p>
            <span className="font-semibold">Customer Name:</span>{" "}
            {order.shippingAddress?.name}
          </p>
          <p>
            <span className="font-semibold">Address:</span>{" "}
            {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
          </p>
          <p>
            <span className="font-semibold">Phone:</span>{" "}
            {order.shippingAddress?.phone}
          </p>
          <p>
            <span className="font-semibold">Email:</span>{" "}
            {order.user?.email}
          </p>
        </div>
      </div>

      {/* Price Breakdown */}
      <div>
        <h2 className="text-lg font-bold text-gray-700">Price Breakdown</h2>
        <div className="mt-2 text-sm text-gray-600">
          <p className="flex justify-between">
            <span>Subtotal:</span> <span>₹{order.subtotal.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span>Tax:</span> <span>₹{order.tax.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span>Shipping Fees:</span> <span>₹{order.shippingCharge.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span>Discount:</span> <span>- ₹{order.discount.toFixed(2)}</span>
          </p>
          <hr className="my-2" />
          <p className="flex justify-between font-bold text-gray-700">
            <span>Total Price:</span> <span>₹{order.total.toFixed(2)}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceBill;