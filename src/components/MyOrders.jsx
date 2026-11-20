import React, { useEffect, useState } from 'react'
import { useNavigate } from "@/lib/router"
import axios from 'axios'
import { LuEye } from 'react-icons/lu'
import InvoiceBill from '../Admin/components/InvoiceBill'

export default function MyOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAdressModalOpen, setAdressModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  })
  const userId = localStorage.getItem("userId");

  const openAdressModal = (order) => {
    setSelectedOrder(order);
    setAdressModalOpen(true);
  };

  const closeAdressModal = () => {
    setAdressModalOpen(false);
    setSelectedOrder(null);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`/api/orders/getAllOrders?page=${pagination.page}&limit=${pagination.limit}`)
        console.log("response : ", response.data.orders)
        const filteredOrders = response?.data?.orders?.filter((order) => order?.user?._id === userId)
        setOrders(filteredOrders)
        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages
        })
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch orders')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [pagination.page, pagination.limit])

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage })
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl bg-white pb-44 pl-0 p-8 pt-0">
        <div className="bg-white rounded-xl shadow-lg p-16 relative flex flex-col items-center">
          <p>Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl bg-white pb-44 pl-0 p-8 pt-0">
        <div className="bg-white rounded-xl shadow-lg p-16 relative flex flex-col items-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl bg-white pb-44 pl-0 p-8 pt-0">
        <div className="bg-white rounded-xl shadow-lg p-16 relative flex flex-col items-center">
          <p>No orders found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl bg-white pb-44 pl-0 p-8 pt-0">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6">All Orders</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 cursor-pointer"
                // onClick={() => navigate(`/orders/${order._id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order._id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.user?.firstName} {order.user?.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{order.user?.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.items.length} items</div>
                    <div className="text-sm text-gray-500">{order.items[0]?.name} {order.items.length > 1 ? '...' : ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{order.total.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
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
                      {/* <Dropdown options={diliveryBoys} /> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> orders
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={`px-3 py-1 rounded-md ${pagination.page === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className={`px-3 py-1 rounded-md ${pagination.page === pagination.totalPages ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
       <Modal isOpen={isAdressModalOpen} onClose={closeAdressModal}>
        {selectedOrder && <InvoiceBill order={selectedOrder} />}
      </Modal>
    </div>
  )
}

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
 
