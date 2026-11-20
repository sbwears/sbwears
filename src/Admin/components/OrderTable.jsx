
// import { LuEye } from "react-icons/lu";
// import React, { useState, useEffect } from "react";
// import InvoiceBill from "./InvoiceBill";
// import axios from "axios";

// export const OrderTable = () => {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isModalOpen, setModalOpen] = useState(false);
//   const [isAdressModalOpen, setAdressModalOpen] = useState(false);
//   const [selectedOrder, setSelectedOrder] = useState(null);

//   const statusOptions = [
//     { value: "pending", label: "Pending" },
//     { value: "processing", label: "Processing" },
//     { value: "shipped", label: "Shipped" },
//     { value: "delivered", label: "Delivered" },
//     { value: "cancelled", label: "Cancelled" },
//   ];

//   const paymentStatusOptions = [
//     { value: "pending", label: "Pending" },
//     { value: "completed", label: "Completed" },
//     { value: "failed", label: "Failed" },
//     { value: "refunded", label: "Refunded" },
//   ];

//   const diliveryBoys = [
//     { value: "Select Delivery", label: "Select Delivery" },
//     { value: "Ajay", label: "Ajay" },
//     { value: "Kiran", label: "Kiran" },
//     { value: "Abay", label: "Abay" },
//   ];

//   useEffect(() => {
//     fetchOrders();
//   }, []);
//   console.log("orders : " , orders)
//   const fetchOrders = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get("/api/orders/getAllOrders");
//       if (response.data.success) {
//         setOrders(response.data.orders);
//       } else {
//         setError("Failed to fetch orders");
//       }
//     } catch (err) {
//       console.error("Error fetching orders:", err);
//       setError("Failed to fetch orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const updateOrderStatus = async (orderId, newStatus) => {
//     try {
//       const response = await axios.put(
//         `/api/orders/${orderId}/status`,
//         { status: newStatus }
//       );
      
//       if (response.data.success) {
//         // Update the local state with the updated order
//         setOrders(prevOrders => 
//           prevOrders.map(order => 
//             order._id === orderId ? response.data.order : order
//           )
//         );
//       }
//     } catch (err) {
//       console.error("Error updating order status:", err);
//       alert("Failed to update order status");
//     }
//   };

//   const updatePaymentStatus = async (orderId, newPaymentStatus) => {
//     try {
//       const response = await axios.put(
//         `/api/orders/${orderId}/payment-status`,
//         { paymentStatus: newPaymentStatus }
//       );
      
//       if (response.data.success) {
//         // Update the local state with the updated order
//         setOrders(prevOrders => 
//           prevOrders.map(order => 
//             order._id === orderId ? response.data.order : order
//           )
//         );
//       }
//     } catch (err) {
//       console.error("Error updating payment status:", err);
//       alert("Failed to update payment status");
//     }
//   };

//   const openAdressModal = (order) => {
//     setSelectedOrder(order);
//     setAdressModalOpen(true);
//   };

//   const closeAdressModal = () => {
//     setAdressModalOpen(false);
//     setSelectedOrder(null);
//   };

//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-GB');
//   };

//   if (loading) {
//     return <div className="flex justify-center py-8">Loading orders...</div>;
//   }

//   if (error) {
//     return <div className="flex justify-center py-8 text-red-500">{error}</div>;
//   }

//   return (
//     <div className="">
//       <div className="overflow-x-auto rounded-xl">
//         <table className="table-auto w-full">
//           <thead>
//             <tr className="bg-black text-left text-white">
//               <th className="border-b border-gray-300 px-4 py-4">SNo</th>
//               <th className="border-b border-gray-300 px-4 py-4">Order ID</th>
//               <th className="border-b border-gray-300 px-4 py-2">
//                 Customer Name
//               </th>
//               <th className="border-b border-gray-300 px-4 py-2">
//                 Customer Phone
//               </th>
//               <th className="border-b border-gray-300 px-4 py-2">
//                 Total Amount
//               </th>
//               <th className="border-b border-gray-300 px-4 py-2">Date</th>
//               <th className="border-b border-gray-300 px-4 py-2">Status</th>
//               <th className="border-b border-gray-300 px-4 py-2">Payment Status</th>
//               <th className="border-b border-gray-300 px-4 py-2">Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {orders.map((order, index) => (
//               <tr key={order._id} className="hover:bg-gray-50">
//                 <td className="border-b border-gray-300 px-4 py-5">
//                   {index + 1}
//                 </td>
//                 <td className="border-b border-gray-300 px-4 py-5">
//                   {order._id}
//                 </td>
//                 <td className="border-b border-gray-300 px-4 py-2">
//                   {order.user?.firstName} {order.user?.lastName}
//                 </td>
//                 <td className="border-b border-gray-300 px-4 py-2">
//                   {order.user?.phoneNumber}
//                 </td>
//                 <td className="border-b border-gray-300 px-4 py-2">
//                   ₹{order.total}
//                 </td>
//                 <td className="border-b border-gray-300 px-4 py-2">
//                   {formatDate(order.createdAt)}
//                 </td>
//                 <td className="border-b border-gray-300 px-4 py-2">
//                   <Dropdown 
//                     options={statusOptions} 
//                     value={order.status}
//                     onChange={(value) => updateOrderStatus(order._id, value)}
//                   />
//                 </td>
//                 <td className="border-b border-gray-300 px-4 py-2">
//                   <Dropdown 
//                     options={paymentStatusOptions} 
//                     value={order.paymentStatus}
//                     onChange={(value) => updatePaymentStatus(order._id, value)}
//                   />
//                 </td>
//                 <td className="border-b border-gray-300 px-4 py-2 ">
//                   <div className="flex flex-row gap-3 items-center justify-center">
//                     <div 
//                       className="border bg-black rounded-lg flex flex-row items-center gap-1 py-2 px-2 cursor-pointer"
//                       onClick={() => openAdressModal(order)}
//                     >
//                       <LuEye className="size-4 cursor-pointer text-white" />
//                       <div className="flex flex-row">
//                         <p className="text-xs text-white">View </p>
//                         <p className="text-xs text-white">Details </p>
//                       </div>
//                     </div>
//                     {/* <Dropdown options={diliveryBoys} /> */}
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
      
//       <Modal isOpen={isAdressModalOpen} onClose={closeAdressModal}>
//         {selectedOrder && <InvoiceBill order={selectedOrder} />}
//       </Modal>
//     </div>
//   );
// };

// const Modal = ({ isOpen, onClose, children }) => {
//   if (!isOpen) return null;
//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="bg-white rounded-lg shadow-lg overflow-auto max-w-4xl w-full mx-4 max-h-[90vh]">
//         <div className="flex justify-end mt-5 mr-5">
//           <button
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-800 text-xl"
//           >
//             ✕
//           </button>
//         </div>
//         <div className="p-6">{children}</div>
//       </div>
//     </div>
//   );
// };

// const Dropdown = ({ options, value, onChange, placeholder = "Select..." }) => {
//   const handleChange = (event) => {
//     onChange(event.target.value);
//   };

//   return (
//     <select
//       value={value}
//       onChange={handleChange}
//       className="px-3 py-1 text-left border border-gray-300 rounded-md focus:outline-none"
//     >
//       {options.map((option) => (
//         <option key={option.value} value={option.value}>
//           {option.label}
//         </option>
//       ))}
//     </select>
//   );
// };

import { LuEye } from "react-icons/lu";
import React, { useState, useEffect } from "react";
import InvoiceBill from "./InvoiceBill";
import axios from "axios";

export const OrderTable = ({ searchTerm }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isAdressModalOpen, setAdressModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const paymentStatusOptions = [
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
    { value: "refunded", label: "Refunded" },
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search term
  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = orders.filter(order => {
        // Search by customer name
        const fullName = `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.toLowerCase();
        // Search by phone number
        const phone = order.user?.phoneNumber?.toLowerCase() || '';
        // Search by order ID
        const orderId = order._id?.toLowerCase() || '';
        // Search by shipping address phone
        const shippingPhone = order.shippingAddress?.phone?.toLowerCase() || '';
        
        return (
          fullName.includes(term) ||
          phone.includes(term) ||
          orderId.includes(term) ||
          shippingPhone.includes(term)
        );
      });
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchTerm, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/orders/getAllOrders");
      console.log("response data : " , response.data)
      if (response.data.success) {
        setOrders(response.data.orders);
        setFilteredOrders(response.data.orders);
      } else {
        setError("Failed to fetch orders");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `/api/orders/${orderId}/status`,
        { status: newStatus }
      );
      
      if (response.data.success) {
        // Update the local state with the updated order
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? response.data.order : order
          )
        );
        alert("Order status updated successfully!");
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      alert("Failed to update order status");
    }
  };

  const updatePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      const response = await axios.put(
        `/api/orders/${orderId}/payment-status`,
        { paymentStatus: newPaymentStatus }
      );
      
      if (response.data.success) {
        // Update the local state with the updated order
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? response.data.order : order
          )
        );
        alert("Payment status updated successfully!");
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
      alert("Failed to update payment status");
    }
  };

  const openAdressModal = (order) => {
    setSelectedOrder(order);
    setAdressModalOpen(true);
  };

  const closeAdressModal = () => {
    setAdressModalOpen(false);
    setSelectedOrder(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading orders...</div>;
  }

  if (error) {
    return <div className="flex justify-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="">
      <div className="overflow-x-auto rounded-xl">
        <table className="table-auto w-full">
          <thead>
            <tr className="bg-black text-left text-white">
              <th className="border-b border-gray-300 px-4 py-4">SNo</th>
              <th className="border-b border-gray-300 px-4 py-4">Order ID</th>
              <th className="border-b border-gray-300 px-4 py-2">
                Customer Name
              </th>
              <th className="border-b border-gray-300 px-4 py-2">
                Customer Phone
              </th>
              <th className="border-b border-gray-300 px-4 py-2">
                Total Amount
              </th>
              <th className="border-b border-gray-300 px-4 py-2">Date</th>
              <th className="border-b border-gray-300 px-4 py-2">Status</th>
              <th className="border-b border-gray-300 px-4 py-2">Payment Status</th>
              <th className="border-b border-gray-300 px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  {searchTerm ? "No orders found matching your search" : "No orders found"}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, index) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="border-b border-gray-300 px-4 py-5">
                    {index + 1}
                  </td>
                  <td className="border-b border-gray-300 px-4 py-5">
                    {order._id}
                  </td>
                  <td className="border-b border-gray-300 px-4 py-2">
                    {order.user?.firstName} {order.user?.lastName}
                  </td>
                  <td className="border-b border-gray-300 px-4 py-2">
                    {order.user?.phoneNumber}
                  </td>
                  <td className="border-b border-gray-300 px-4 py-2">
                    ₹{order.total}
                  </td>
                  <td className="border-b border-gray-300 px-4 py-2">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="border-b border-gray-300 px-4 py-2">
                    <Dropdown 
                      options={statusOptions} 
                      value={order.status}
                      onChange={(value) => updateOrderStatus(order._id, value)}
                    />
                  </td>
                  <td className="border-b border-gray-300 px-4 py-2">
                    <Dropdown 
                      options={paymentStatusOptions} 
                      value={order.paymentStatus}
                      onChange={(value) => updatePaymentStatus(order._id, value)}
                    />
                  </td>
                  <td className="border-b border-gray-300 px-4 py-2 ">
                    <div className="flex flex-row gap-3 items-center justify-center">
                      <div 
                        className="border bg-black rounded-lg flex flex-row items-center gap-1 py-2 px-2 cursor-pointer"
                        onClick={() => openAdressModal(order)}
                      >
                        <LuEye className="size-4 cursor-pointer text-white" />
                        <div className="flex flex-row">
                          <p className="text-xs text-white">View </p>
                          <p className="text-xs text-white">Details </p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <Modal isOpen={isAdressModalOpen} onClose={closeAdressModal}>
        {selectedOrder && <InvoiceBill order={selectedOrder} />}
      </Modal>
    </div>
  );
};

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg overflow-auto max-w-4xl w-full mx-4 max-h-[90vh]">
        <div className="flex justify-end mt-5 mr-5">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Dropdown = ({ options, value, onChange, placeholder = "Select..." }) => {
  const handleChange = (event) => {
    onChange(event.target.value);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className="px-3 py-1 text-left border border-gray-300 rounded-md focus:outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};